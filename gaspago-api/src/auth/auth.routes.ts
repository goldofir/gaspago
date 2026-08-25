import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Redis from 'ioredis'
import { OtpService } from './otp.service'
import { sendText } from '../whatsapp/client'
import { prisma } from '../shared/prisma'
import { placeInMatrix, resolveReferrer } from '../commissions/matrix-placement.service'

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

const RATE_LIMIT_PREFIX = 'otp_rl:'
const RATE_LIMIT_TTL = 60 // seconds

const requestBodySchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/),
})

const verifyBodySchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/),
  code: z.string(),
  ref: z.string().optional(),
})

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /otp/request
  app.post('/otp/request', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parseResult = requestBodySchema.safeParse(req.body)
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() })
    }

    const { phone } = parseResult.data

    // Rate limit check
    const rateLimitKey = RATE_LIMIT_PREFIX + phone
    const existing = await redis.get(rateLimitKey)
    if (existing) {
      return reply
        .status(429)
        .send({ error: 'Aguarde 60 segundos antes de solicitar outro código' })
    }

    const code = await OtpService.generate(phone)

    await sendText(phone, `Seu código Gás Pago: ${code}. Válido por 5 minutos.`)

    // Set rate limit key after sending
    await redis.setex(rateLimitKey, RATE_LIMIT_TTL, '1')

    return reply.send({ ok: true })
  })

  // POST /otp/verify
  app.post('/otp/verify', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parseResult = verifyBodySchema.safeParse(req.body)
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() })
    }

    const { phone, code, ref } = parseResult.data

    const valid = await OtpService.verify(phone, code)
    if (!valid) {
      return reply.status(401).send({ error: 'Código inválido ou expirado' })
    }

    // upsert can't tell us create-vs-existing, and matrix placement (like the
    // referral link itself) only makes sense on first signup — logging back
    // in with a stale ?ref= in the URL should never re-parent an existing user.
    let user = await prisma.user.findUnique({ where: { phone } })
    const isNewUser = !user
    if (!user) {
      user = await prisma.user.create({
        data: { phone, actorType: 'CONSUMER', affiliateStatus: 'ACTIVE' },
      })
    }

    if (isNewUser) {
      // Falls back to the company's own referral code (SuperAdmin →
      // Credenciais → Comissões) when no ?ref= was used — everyone ends up
      // somewhere in the network, never with no matrix position at all.
      const referrer = await resolveReferrer(ref, user.id)
      if (referrer) {
        await prisma.user.update({ where: { id: user.id }, data: { referredById: referrer.id } })
        await placeInMatrix(user.id, referrer.id).catch(err => console.error('[matrix] placement failed for', user!.id, err))
      }
    }

    const token = (app as any).jwt.sign(
      { id: user.id, phone: user.phone, role: user.actorType },
      { expiresIn: '30d' },
    )

    // Field names must match the mobile app's VerifyOtpResponse/User types
    // exactly (access_token/token_type, snake_case FGOL fields) — it previously
    // sent "token" instead of "access_token", so setToken(res.access_token)
    // always set the token to undefined and login silently never completed.
    return reply.send({
      access_token: token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        plan: user.plan,
        referral_code: user.referralCode,
        actorType: user.actorType,
        affiliateStatus: user.affiliateStatus,
        fgol_balance: user.fgolBalance,
        fgol_frozen: user.fgolFrozen,
      },
    })
  })

  // GET /me
  app.get('/me', async (req, reply) => {
    await (req as any).jwtVerify()

    const payload = (req as any).user as { id: string }

    // A stale token for a since-deleted user (found live testing /painel —
    // leftover localStorage token from an earlier test account) should read
    // as "log me out," not crash the request with a raw 500.
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        cpf: true,
        plan: true,
        referralCode: true,
        actorType: true,
        affiliateStatus: true,
        fgolBalance: true,
        fgolFrozen: true,
        lastPurchaseAt: true,
        createdAt: true,
      },
    })
    if (!user) return reply.status(401).send({ error: 'Sessão inválida.' })

    // Mobile's User type reads plan/referral_code/fgol_balance/fgol_frozen —
    // this used to omit plan/referralCode entirely and return the FGOL fields
    // camelCase, so the app's plan badge and referral card always showed the
    // FREE/"—" fallback regardless of the account's real state.
    return reply.send({
      ...user,
      referral_code: user.referralCode,
      fgol_balance: user.fgolBalance,
      fgol_frozen: user.fgolFrozen,
    })
  })

  // PATCH /me — self-service profile edit (name/email/cpf). No self-service
  // edit ever existed before this (mobile only ever displayed these
  // read-only) — email and cpf are @unique, so a real conflict is expected
  // and handled explicitly rather than surfacing a raw Prisma error.
  const updateMeSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    cpf: z.string().regex(/^\d{11}$/, 'CPF deve ter 11 dígitos').optional(),
  })

  app.patch('/me', async (req, reply) => {
    await (req as any).jwtVerify()
    const payload = (req as any).user as { id: string }

    const parseResult = updateMeSchema.safeParse(req.body)
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.flatten() })
    }
    const data = parseResult.data

    if (data.email) {
      const clash = await prisma.user.findFirst({ where: { email: data.email, id: { not: payload.id } } })
      if (clash) return reply.status(409).send({ error: 'Esse e-mail já está em uso por outra conta.' })
    }
    if (data.cpf) {
      const clash = await prisma.user.findFirst({ where: { cpf: data.cpf, id: { not: payload.id } } })
      if (clash) return reply.status(409).send({ error: 'Esse CPF já está cadastrado em outra conta.' })
    }

    // Same stale-token guard as GET /me — a deleted user's token trying to
    // save a profile should read as "log me out," not a raw 500.
    const exists = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true } })
    if (!exists) return reply.status(401).send({ error: 'Sessão inválida.' })

    const user = await prisma.user.update({
      where: { id: payload.id },
      data,
      select: { id: true, phone: true, name: true, email: true, cpf: true },
    })

    return reply.send(user)
  })
}
