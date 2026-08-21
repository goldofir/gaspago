import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { createSubAccount } from '../payments/asaas.client'
import { requireRole } from '../shared/auth.middleware'

const CreateEstablishmentSchema = z.object({
  name: z.string(),
  category: z.string().default('servico'),
  cnpj: z.string(),
  companyType: z.enum(['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION']),
  phone: z.string().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  cashbackPercent: z.number().min(0).max(1),
})

function asaasErrorMessage(err: any): string | null {
  const errors = err?.response?.data?.errors
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e: any) => e.description).join(' ')
  }
  return null
}

export async function establishmentRoutes(app: FastifyInstance) {
  // POST /establishments — onboard new establishment (POS partner). credenciadorId
  // always comes from the authenticated account, never the request body.
  app.post('/', { preHandler: requireRole('CREDENCIADOR') }, async (req, reply) => {
    const { companyType, ...body } = CreateEstablishmentSchema.parse(req.body)
    const credenciadorId = (req as any).user.id as string

    let asaasAccount
    try {
      asaasAccount = await createSubAccount({
        name: body.name,
        email: `${body.cnpj}@gaspago.app`,
        cpfCnpj: body.cnpj,
        companyType,
        mobilePhone: body.phone ?? '',
        address: body.address,
        addressNumber: '0',
        province: body.city,
        postalCode: body.postalCode,
      })
    } catch (err: any) {
      const msg = asaasErrorMessage(err)
      return reply.status(400).send({ error: msg ?? 'Não foi possível criar a subconta Asaas. Verifique os dados e a API Key em Credenciais.' })
    }

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
