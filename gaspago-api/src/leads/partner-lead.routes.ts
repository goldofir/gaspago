import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { verifyWeb3AuthToken } from '../auth/web3auth.service'
import { placeInMatrix, resolveReferrer } from '../commissions/matrix-placement.service'

const CreateLeadSchema = z.object({
  type: z.enum(['DISTRIBUTOR', 'ESTABLISHMENT']),
  name: z.string().min(1),
  cnpj: z.string().optional(),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  category: z.string().optional(),
  message: z.string().optional(),
  // Present only on the self-service signup flow (Web3Auth) — absent means
  // the old "just capture a lead, we'll call you" path, kept for API
  // backward-compat even though the current /parceiro form always sends these.
  idToken: z.string().optional(),
  walletAddress: z.string().optional(),
  // Distributors/establishments are affiliates too — same as consumers, they
  // land in the network via ?ref= or the company fallback code.
  ref: z.string().optional(),
})

export async function partnerLeadRoutes(app: FastifyInstance) {
  // POST /partner-leads — public form on the site ("Quero ser parceira" /
  // "Quero anunciar"). When idToken+walletAddress are present (Web3Auth
  // signup), this creates a real, wallet-authenticated User immediately
  // (PENDING_APPROVAL) and returns a portal session — not just a lead
  // record nobody could ever log into. Without them, falls back to the
  // old lead-only capture (no account created, matches prior behavior).
  app.post('/', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parsed = CreateLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { idToken, walletAddress, ref, ...leadFields } = parsed.data

    if (!idToken || !walletAddress) {
      const lead = await prisma.partnerLead.create({ data: leadFields })
      return reply.status(201).send({ id: lead.id })
    }

    let profile
    try {
      profile = await verifyWeb3AuthToken(idToken, walletAddress)
    } catch (err: any) {
      return reply.status(err.statusCode ?? 401).send({ error: err.message ?? 'Falha na autenticação.' })
    }

    const existing = await prisma.user.findUnique({ where: { walletAddress } })
    if (existing) {
      return reply.status(409).send({ error: 'Essa carteira já tem um cadastro. Use "Entrar" para acessar.' })
    }

    const email = leadFields.email ?? profile.email ?? undefined
    const user = await prisma.user.create({
      data: {
        phone: leadFields.phone,
        name: leadFields.name,
        email,
        walletAddress,
        actorType: leadFields.type,
        portalStatus: 'PENDING_APPROVAL',
      },
    })

    const referrer = await resolveReferrer(ref, user.id)
    if (referrer) {
      await prisma.user.update({ where: { id: user.id }, data: { referredById: referrer.id } })
      await placeInMatrix(user.id, referrer.id).catch(err => console.error('[matrix] placement failed for', user.id, err))
    }

    const lead = await prisma.partnerLead.create({ data: { ...leadFields, email, userId: user.id } })

    const token = (app as any).jwt.sign(
      { id: user.id, role: user.actorType, portalStatus: user.portalStatus },
      { expiresIn: '12h' },
    )

    return reply.status(201).send({ id: lead.id, token, role: user.actorType, portalStatus: user.portalStatus })
  })
}
