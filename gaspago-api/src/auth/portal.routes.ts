import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../shared/prisma'
import { verifyWeb3AuthToken } from './web3auth.service'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const Web3AuthLoginSchema = z.object({
  idToken: z.string(),
  walletAddress: z.string(),
})

const PORTAL_ROLES = ['DISTRIBUTOR', 'CREDENCIADOR', 'ESTABLISHMENT'] as const

// Auth for the three B2B web portals (distributor, credenciador, POS/establishment).
// Separate from /auth/otp (consumer) and /admin/auth (superadmin) since the
// identity source and JWT payload shape differ (role + distributorId/establishmentId).
export async function portalAuthRoutes(app: FastifyInstance) {
  // POST /auth/portal-login
  app.post('/portal-login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
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
        portalStatus: user.portalStatus,
      },
      { expiresIn: '12h' },
    )

    return reply.send({ token, role: user.actorType, name: user.name, portalStatus: user.portalStatus })
  })

  // POST /auth/web3auth-login — returning login for partners who signed up
  // via Web3Auth (no password set). Looks up the account by wallet address,
  // which verifyWeb3AuthToken already confirmed the caller actually owns.
  app.post('/web3auth-login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { idToken, walletAddress } = Web3AuthLoginSchema.parse(req.body)

    let profile
    try {
      profile = await verifyWeb3AuthToken(idToken, walletAddress)
    } catch (err: any) {
      return reply.status(err.statusCode ?? 401).send({ error: err.message ?? 'Falha na autenticação.' })
    }

    const user = await prisma.user.findUnique({ where: { walletAddress: profile.walletAddress } })
    if (!user || !PORTAL_ROLES.includes(user.actorType as any)) {
      return reply.status(404).send({ error: 'Cadastro não encontrado. Use o formulário "Quero ser parceiro" para se cadastrar.' })
    }

    const token = (app as any).jwt.sign(
      {
        id: user.id,
        role: user.actorType,
        distributorId: user.distributorId ?? undefined,
        establishmentId: user.establishmentId ?? undefined,
        portalStatus: user.portalStatus,
      },
      { expiresIn: '12h' },
    )

    return reply.send({ token, role: user.actorType, name: user.name, portalStatus: user.portalStatus })
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
