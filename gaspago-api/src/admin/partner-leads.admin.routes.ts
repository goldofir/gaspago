import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'

const PatchSchema = z.object({
  status: z.enum(['PENDING', 'CONTACTED', 'APPROVED', 'REJECTED']).optional(),
  notes: z.string().optional(),
})

// Business terms only SuperAdmin can set — the partner never self-declares
// their own cashback % or which credenciador covers their region. Required
// only when approving a lead that has a linked self-service-signup user
// (userId set); old-style leads with no account still just flip a label.
const ApprovalDetailsSchema = z.object({
  cep: z.string().min(1),
  address: z.string().min(1),
  cashbackPercent: z.number().min(0).max(20),
  credenciadorId: z.string().optional(), // defaults to the approving admin, same as POST /admin/distributors
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

  // PATCH /admin/leads/:id — update status / internal notes while working the lead.
  // Approving a lead with a linked self-service-signup user (userId) creates
  // the real Distributor/Establishment (needs approvalDetails in the body) and
  // activates the account — this used to just flip a status label with no
  // account ever created. Rejecting one also marks the linked user REJECTED.
  app.patch('/leads/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const lead = await prisma.partnerLead.findUnique({ where: { id }, include: { user: true } })
    if (!lead) return reply.status(404).send({ error: 'Lead não encontrado.' })

    if (parsed.data.status === 'APPROVED' && lead.user) {
      if (lead.user.portalStatus === 'ACTIVE') {
        return reply.status(409).send({ error: 'Esta conta já foi aprovada.' })
      }
      const details = ApprovalDetailsSchema.safeParse(req.body)
      if (!details.success) {
        return reply.status(400).send({ error: 'Informe endereço, CEP e cashback para aprovar este cadastro.', details: details.error.flatten().fieldErrors })
      }
      const { cep, address, cashbackPercent, credenciadorId } = details.data
      const adminId = credenciadorId ?? (req as any).user?.id ?? 'system'

      if (lead.type === 'DISTRIBUTOR') {
        if (!lead.cnpj) return reply.status(400).send({ error: 'Lead sem CNPJ — não é possível criar a distribuidora.' })
        await prisma.distributor.create({
          data: {
            name: lead.name,
            cnpj: lead.cnpj,
            phone: lead.phone,
            email: lead.email ?? undefined,
            postalCode: cep,
            address,
            city: lead.city ?? '',
            state: lead.state ?? '',
            cashbackPercent: cashbackPercent / 100,
            credenciadorId: adminId,
            isActive: true,
          },
        })
      } else {
        if (!lead.cnpj) return reply.status(400).send({ error: 'Lead sem CNPJ — não é possível criar o estabelecimento.' })
        await prisma.establishment.create({
          data: {
            name: lead.name,
            category: lead.category ?? 'servico',
            cnpj: lead.cnpj,
            phone: lead.phone,
            postalCode: cep,
            address,
            city: lead.city ?? '',
            state: lead.state ?? '',
            cashbackPercent: cashbackPercent / 100,
            credenciadorId: adminId,
            isActive: true,
          },
        })
      }

      // Link the freshly-created business record and flip the account live —
      // findFirst by cnpj since Distributor/Establishment don't expose the
      // insert id outside this block and re-querying by the unique cnpj is
      // simpler than threading two differently-typed creates through one var.
      if (lead.type === 'DISTRIBUTOR') {
        const distributor = await prisma.distributor.findUniqueOrThrow({ where: { cnpj: lead.cnpj! } })
        await prisma.user.update({ where: { id: lead.user.id }, data: { distributorId: distributor.id, portalStatus: 'ACTIVE' } })
      } else {
        const establishment = await prisma.establishment.findUniqueOrThrow({ where: { cnpj: lead.cnpj! } })
        await prisma.user.update({ where: { id: lead.user.id }, data: { establishmentId: establishment.id, portalStatus: 'ACTIVE' } })
      }
    } else if (parsed.data.status === 'REJECTED' && lead.user) {
      await prisma.user.update({ where: { id: lead.user.id }, data: { portalStatus: 'REJECTED' } })
    }

    const updated = await prisma.partnerLead.update({ where: { id }, data: parsed.data })
    return reply.send(updated)
  })
}
