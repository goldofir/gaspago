import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'
import { getOrCreateCustomerId } from '../payments/customer.service'
import { getPixQrCode } from '../payments/asaas.client'
import axios from 'axios'

const ASAAS_URLS: Record<string, string> = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/api/v3',
}

export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /plans — public, active plans only, configured via SuperAdmin
  app.get('/plans', async (_req, reply) => {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
      select: { id: true, name: true, slug: true, price: true, billingCycle: true, features: true },
    })
    // Prisma Decimal serializes to a string over JSON — coerce here so every
    // client (web, mobile) can treat price as a real number.
    return reply.send(plans.map(p => ({ ...p, price: Number(p.price) })))
  })

  // GET /me — JWT required
  app.get('/me', async (req, reply) => {
    try {
      await (req as any).jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { id: userId } = (req as any).user

    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription || !subscription.isActive) {
      return reply.send({ plan: 'FREE', status: 'ACTIVE', expiresAt: null })
    }

    return reply.send({
      plan: subscription.plan,
      status: subscription.isActive ? 'ACTIVE' : 'CANCELLED',
      expiresAt: subscription.expiresAt,
      asaasSubscriptionId: subscription.asaasSubId,
    })
  })

  // POST /subscribe — JWT required
  app.post('/subscribe', async (req, reply) => {
    try {
      await (req as any).jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { id: userId } = (req as any).user
    // planId is preferred; plan/slug kept as a fallback so any existing caller
    // still resolves to the seeded "premium" plan instead of breaking outright.
    // cpf is only used if the user's profile doesn't already have one saved —
    // Asaas rejects a PIX charge without a CPF/CNPJ on the customer.
    const body = req.body as { planId?: string; plan?: string; cpf?: string } | undefined

    const plan = body?.planId
      ? await prisma.plan.findUnique({ where: { id: body.planId } })
      : await prisma.plan.findUnique({ where: { slug: (body?.plan ?? 'premium').toLowerCase() } })

    if (!plan || !plan.isActive) {
      return reply.status(400).send({ error: 'Plano inválido ou indisponível.' })
    }

    const env = (SystemConfigService.get('ASAAS_ENV') ?? 'sandbox') as string
    const baseURL = ASAAS_URLS[env] ?? ASAAS_URLS.sandbox
    const apiKey = SystemConfigService.getOrThrow('ASAAS_API_KEY')

    const nextDueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Asaas needs a real Asaas Customer id here, not our internal userId — same
    // lazy-create-and-cache helper the order/marketplace checkouts already use.
    // Passing userId directly (the previous behavior) always failed with
    // "Cliente inválido ou não informado," since no such customer exists on
    // Asaas's side — this subscribe flow had never actually been exercised
    // end-to-end before.
    const asaasCustomerId = await getOrCreateCustomerId(userId, body?.cpf)

    let asaasRes: any = null
    try {
      asaasRes = await axios.post(
        `${baseURL}/subscriptions`,
        {
          customer: asaasCustomerId,
          billingType: 'PIX',
          value: Number(plan.price),
          nextDueDate,
          cycle: plan.billingCycle,
          description: `Gas Pago ${plan.name}`,
        },
        {
          headers: { access_token: apiKey },
        }
      )
    } catch (err: any) {
      return reply.status(502).send({ error: 'Asaas error', details: err?.response?.data ?? err?.message })
    }

    const asaasSubscriptionId: string = asaasRes.data?.id ?? null

    // POST /subscriptions creates the recurring plan itself — it does NOT
    // return a PIX code inline (asaasRes.data.pix is always undefined here,
    // a bug in this route until now). The first charge is generated as a
    // separate Payment under the subscription; fetch it, then its PIX QR
    // code, same helper POS/order checkout already uses. Best-effort: if
    // Asaas hasn't materialized the first payment yet, the subscription
    // still gets created — the consumer just won't see a QR code this
    // request and would need to retry.
    let pixQrCode: string | null = null
    let pixKey: string | null = null
    try {
      const paymentsRes = await axios.get(`${baseURL}/subscriptions/${asaasSubscriptionId}/payments`, {
        headers: { access_token: apiKey },
      })
      const firstPaymentId = paymentsRes.data?.data?.[0]?.id
      if (firstPaymentId) {
        const qr = await getPixQrCode(firstPaymentId)
        // Both web and mobile display `pixQrCode` as plain copy-paste text
        // (a "copia e cola" box, not an <img>) — that's qr.payload, not the
        // base64 PNG in qr.encodedImage.
        pixQrCode = qr.payload ?? null
        pixKey = qr.payload ?? null
      }
    } catch (err: any) {
      app.log.warn({ err: err?.response?.data ?? err?.message, asaasSubscriptionId }, '[subscribe] could not fetch PIX QR code for first payment')
    }

    const existing = await prisma.subscription.findFirst({ where: { userId } })

    // isActive/expiresAt are NOT set here — a PIX charge being generated isn't
    // a confirmed payment. Activation (and the network commission on the price
    // paid) only happens in the Asaas webhook once PAYMENT_CONFIRMED actually
    // arrives, so nobody gets premium-tier rates — or pays their upline — for
    // a charge that was never paid. If the user already has an active plan,
    // leave it untouched while this new charge is pending.
    let subscription: any
    if (existing) {
      subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan: 'PREMIUM',
          planId: plan.id,
          asaasSubId: asaasSubscriptionId,
        },
      })
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan: 'PREMIUM',
          planId: plan.id,
          isActive: false,
          expiresAt: new Date(),
          asaasSubId: asaasSubscriptionId,
        },
      })
    }

    return reply.send({
      subscription: {
        plan: subscription.plan,
        status: subscription.isActive ? 'ACTIVE' : 'PENDING',
        expiresAt: subscription.expiresAt,
      },
      pixQrCode,
      pixKey,
    })
  })

  // POST /cancel — JWT required
  app.post('/cancel', async (req, reply) => {
    try {
      await (req as any).jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const { id: userId } = (req as any).user

    const subscription = await prisma.subscription.findFirst({
      where: { userId, plan: 'PREMIUM' },
    })

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { isActive: false },
      })
    }

    return reply.send({ ok: true })
  })
}
