import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { createSubAccount } from '../payments/asaas.client'
import { requireRole } from '../shared/auth.middleware'

const CreateEstablishmentSchema = z.object({
  name: z.string(),
  category: z.string().default('servico'),
  cnpj: z.string(),
  phone: z.string().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  cashbackPercent: z.number().min(0).max(1),
})

export async function establishmentRoutes(app: FastifyInstance) {
  // POST /establishments — onboard new establishment (POS partner). credenciadorId
  // always comes from the authenticated account, never the request body.
  app.post('/', { preHandler: requireRole('CREDENCIADOR') }, async (req, reply) => {
    const body = CreateEstablishmentSchema.parse(req.body)
    const credenciadorId = (req as any).user.id as string

    const asaasAccount = await createSubAccount({
      name: body.name,
      email: `${body.cnpj}@gaspago.app`,
      cpfCnpj: body.cnpj,
      mobilePhone: body.phone ?? '',
      address: body.address,
      addressNumber: '0',
      province: body.city,
      postalCode: body.postalCode,
    })

    const establishment = await prisma.establishment.create({
      data: {
        ...body,
        credenciadorId,
        asaasSubAccountId: asaasAccount.id,
        asaasPixKey: asaasAccount.walletId,
      },
    })

    return reply.status(201).send(establishment)
  })

  // GET /establishments/:id
  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.establishment.findUniqueOrThrow({ where: { id } })
  })
}
