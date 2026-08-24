import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'
import { placeInMatrix, resolveReferrer } from '../commissions/matrix-placement.service'

const bodySchema = z.object({
  idToken: z.string(),
  // Absent = consumer/mobile flow (auto-creates a CONSUMER account, unchanged).
  // Present = B2B/admin panel flow — never auto-creates, the email must already
  // belong to a user with the matching role (provisioned via /admin/portal-accounts
  // or the admin's own account). Google is an alternative credential, not a way
  // to self-register into a business portal.
  // 'business' = the unified partner login (single page, any of the 3 B2B roles) —
  // matches whichever role the account actually has, same as email/password login
  // at /auth/portal-login (which never scoped by a single expected role either).
  portal: z.enum(['distributor', 'credenciador', 'pos', 'admin', 'business']).optional(),
  // Consumer signup only — referral code from the ?ref= link that brought them here.
  ref: z.string().optional(),
})

const PORTAL_ROLES: Record<'distributor' | 'credenciador' | 'pos' | 'admin' | 'business', string[]> = {
  distributor: ['DISTRIBUTOR'],
  credenciador: ['CREDENCIADOR'],
  pos: ['ESTABLISHMENT'],
  admin: ['SUPERADMIN', 'ADMIN'],
  business: ['DISTRIBUTOR', 'CREDENCIADOR', 'ESTABLISHMENT'],
}

export async function googleAuthRoutes(app: FastifyInstance) {
  // GET /auth/google-client-id — public info (an OAuth client ID is not a secret,
  // it's meant to be embedded in frontend code). Lets the web app render the
  // Google button without baking the ID into the Docker image at build time.
  app.get('/google-client-id', async () => {
    return { clientId: SystemConfigService.get('GOOGLE_CLIENT_ID') ?? null }
  })

  app.post('/google', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parseResult = bodySchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'idToken é obrigatório' })
    }

    const { idToken, portal, ref } = parseResult.data

    // 1. Verify token via Google tokeninfo endpoint
    let tokenInfo: Record<string, string>
    try {
      const res = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: idToken },
      })
      if (res.data.error) {
        return reply.status(401).send({ error: 'Token Google inválido' })
      }
      tokenInfo = res.data
    } catch {
      return reply.status(401).send({ error: 'Token Google inválido' })
    }

    // 2. Extract fields from tokeninfo response
    const { sub: googleId, email, name, picture: avatarUrl, aud } = tokenInfo

    // 3. Verify aud matches GOOGLE_CLIENT_ID (skip only if not configured yet)
    const expectedClientId = SystemConfigService.get('GOOGLE_CLIENT_ID')
    if (expectedClientId && aud !== expectedClientId) {
      return reply.status(401).send({ error: 'Client ID inválido' })
    }

    // ---- B2B / admin panel flow: look up only, never create ----
    if (portal) {
      if (!email) {
        return reply.status(401).send({ error: 'Conta Google sem e-mail associado.' })
      }

      const roles = PORTAL_ROLES[portal]
      const user = await prisma.user.findFirst({ where: { email, actorType: { in: roles as any } } })

      if (!user) {
        return reply.status(403).send({
          error: 'Esta conta Google não tem acesso a este painel. Peça ao administrador para cadastrar seu e-mail.',
        })
      }

      if (!user.googleId) {
        await prisma.user.update({ where: { id: user.id }, data: { googleId, avatarUrl: avatarUrl ?? undefined } })
      }

      if (portal === 'admin') {
        const token = (app as any).jwt.sign({ id: user.id, role: 'superadmin' }, { expiresIn: '24h' })
        return reply.send({ token, role: 'superadmin' })
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
    }

    // ---- Consumer / mobile flow: upsert by googleId, then by email, else create ----
    let user = await prisma.user.findUnique({ where: { googleId } })

    if (!user && email) {
      const existingByEmail = await prisma.user.findFirst({ where: { email } })
      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            avatarUrl: avatarUrl ?? undefined,
          },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatarUrl,
          phone: googleId,
          actorType: 'CONSUMER',
          affiliateStatus: 'ACTIVE',
        },
      })

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

    return reply.send({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        avatarUrl: (user as any).avatarUrl,
        plan: user.plan,
        referral_code: user.referralCode,
        actorType: user.actorType,
        affiliateStatus: user.affiliateStatus,
        fgol_balance: user.fgolBalance,
        fgol_frozen: user.fgolFrozen,
      },
    })
  })
}
