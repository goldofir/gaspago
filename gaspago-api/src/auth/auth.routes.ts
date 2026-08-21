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

    return reply.send({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        actorType: user.actorType,
        affiliateStatus: user.affiliateStatus,
        fgolBalance: user.fgolBalance,
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
        actorType: true,
        affiliateStatus: true,
        fgolBalance: true,
        fgolFrozen: true,
        lastPurchaseAt: true,
        createdAt: true,
      },
    })

    return reply.send(user)
  })
}
