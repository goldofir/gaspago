import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'

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
})

export async function partnerLeadRoutes(app: FastifyInstance) {
  // POST /partner-leads — public form on the site ("Quero ser parceira" /
  // "Quero anunciar"), replaces the old wa.me-only redirect. Rate-limited
  // since it's unauthenticated.
  app.post('/', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const parsed = CreateLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors })
    }

    const lead = await prisma.partnerLead.create({ data: parsed.data })
    return reply.status(201).send({ id: lead.id })
  })
}
