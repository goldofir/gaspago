import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../shared/prisma'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const PORTAL_ROLES = ['DISTRIBUTOR', 'CREDENCIADOR', 'ESTABLISHMENT'] as const

// Auth for the three B2B web portals (distributor, credenciador, POS/establishment).
// Separate from /auth/otp (consumer) and /admin/auth (superadmin) since the
// identity source and JWT payload shape differ (role + distributorId/establishmentId).
export async function portalAuthRoutes(app: FastifyInstance) {
  // POST /auth/portal-login
  app.post('/portal-login', async (req, reply) => {
    const { email, password } = LoginSchema.parse(req.body)

    const user = await prisma.user.findFirst({
      where: { email, actorType: { in: PORTAL_ROLES as unknown as string[] } as any },
    })

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const token = (app as any).jwt.sign(
      {
        id: user.id,
        role: user.actorType,
        distributorId: user.distributorId ?? undefined,
        establishmentId: user.establishmentId ?? undefined,
      },
      { expiresIn: '12h' },
    )

    return reply.send({ token, role: user.actorType, name: user.name })
  })

  // GET /auth/portal-me — verifies the token and echoes the payload back
  app.get('/portal-me', async (req, reply) => {
    try {
      await (req as any).jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }
    return reply.send((req as any).user)
  })
}
