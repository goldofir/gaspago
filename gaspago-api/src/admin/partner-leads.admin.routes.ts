import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'

const PatchSchema = z.object({
  status: z.enum(['PENDING', 'CONTACTED', 'APPROVED', 'REJECTED']).optional(),
  notes: z.string().optional(),
})

export async function partnerLeadsAdminRoutes(app: FastifyInstance) {
  // GET /admin/leads?status=&type=
  app.get('/leads', async (req, reply) => {
    const { status, type } = req.query as { status?: string; type?: string }
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    const leads = await prisma.partnerLead.findMany({ where, orderBy: { createdAt: 'desc' } })
    const pendingCount = await prisma.partnerLead.count({ where: { status: 'PENDING' } })
    return reply.send({ leads, pendingCount })
  })

  // PATCH /admin/leads/:id — update status / internal notes while working the lead
  app.patch('/leads/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const lead = await prisma.partnerLead.findUnique({ where: { id } })
    if (!lead) return reply.status(404).send({ error: 'Lead não encontrado.' })

    const updated = await prisma.partnerLead.update({ where: { id }, data: parsed.data })
    return reply.send(updated)
  })
}
