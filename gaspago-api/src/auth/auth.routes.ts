import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import Redis from 'ioredis'
import { OtpService } from './otp.service'
import { sendText } from '../whatsapp/client'
import { prisma } from '../shared/prisma'

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')

const RATE_LIMIT_PREFIX = 'otp_rl:'
const RATE_LIMIT_TTL = 60 // seconds

const requestBodySchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/),
})

const verifyBodySchema = z.object({
  phone: z.string().regex(/^\d{10,13}$/),
  code: z.string(),
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

    const { phone, code } = parseResult.data

    const valid = await OtpService.verify(phone, code)
    if (!valid) {
      return reply.status(401).send({ error: 'Código inválido ou expirado' })
    }

    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: {
        phone,
        actorType: 'CONSUMER',
        affiliateStatus: 'ACTIVE',
      },
    })

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

    const user = await prisma.user.findUniqueOrThrow({
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
}
