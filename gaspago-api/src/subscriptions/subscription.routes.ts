import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'
import axios from 'axios'

const ASAAS_URLS: Record<string, string> = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/api/v3',
}

export async function subscriptionRoutes(app: FastifyInstance) {
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

    if (!subscription) {
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
    const body = req.body as { plan: string }

    if (body?.plan !== 'PREMIUM') {
      return reply.status(400).send({ error: 'Invalid plan' })
    }

    const env = (SystemConfigService.get('ASAAS_ENV') ?? 'sandbox') as string
    const baseURL = ASAAS_URLS[env] ?? ASAAS_URLS.sandbox
    const apiKey = SystemConfigService.getOrThrow('ASAAS_API_KEY')

    const nextDueDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    let asaasRes: any = null
    try {
      asaasRes = await axios.post(
        `${baseURL}/subscriptions`,
        {
          customer: userId,
          billingType: 'PIX',
          value: 29.90,
          nextDueDate,
          cycle: 'MONTHLY',
          description: 'Gas Pago Premium',
        },
        {
          headers: { access_token: apiKey },
        }
      )
    } catch (err: any) {
      return reply.status(502).send({ error: 'Asaas error', details: err?.response?.data ?? err?.message })
    }

    const asaasSubscriptionId: string = asaasRes.data?.id ?? null
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const existing = await prisma.subscription.findFirst({ where: { userId } })

    let subscription: any
    if (existing) {
      subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan: 'PREMIUM',
          isActive: true,
          expiresAt,
          asaasSubId: asaasSubscriptionId,
        },
      })
    } else {
      subscription = await prisma.subscription.create({
        data: {
          userId,
          plan: 'PREMIUM',
          isActive: true,
          expiresAt,
          asaasSubId: asaasSubscriptionId,
        },
      })
    }

    return reply.send({
      subscription: {
        plan: subscription.plan,
        status: subscription.isActive ? 'ACTIVE' : 'CANCELLED',
        expiresAt: subscription.expiresAt,
      },
      pixQrCode: asaasRes.data?.pix?.qrCode ?? null,
      pixKey: asaasRes.data?.pix?.payload ?? null,
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
