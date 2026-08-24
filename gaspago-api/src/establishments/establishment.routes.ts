import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { createSubAccount, getSubAccountDocuments, uploadSubAccountDocument, getSubAccountStatus } from '../payments/asaas.client'
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

  // GET /establishments/me — establishment profile
  app.get('/me', { preHandler: requireRole('ESTABLISHMENT') }, async (req) => {
    const estId = (req as any).user?.establishmentId
    if (!estId) throw Object.assign(new Error('Conta não vinculada a um estabelecimento.'), { statusCode: 400 })
    return prisma.establishment.findUniqueOrThrow({ where: { id: estId } })
  })

  // GET /establishments/me/asaas-documents — list documents required by Asaas for establishment
  app.get('/me/asaas-documents', { preHandler: requireRole('ESTABLISHMENT') }, async (req, reply) => {
    const estId = (req as any).user?.establishmentId
    if (!estId) return reply.status(400).send({ error: 'Conta não vinculada a um estabelecimento.' })
    const est = await prisma.establishment.findUniqueOrThrow({ where: { id: estId } })
    if (!est.asaasSubAccountId) {
      return reply.status(400).send({ error: 'Estabelecimento ainda não possui subconta Asaas vinculada.' })
    }
    const documents = await getSubAccountDocuments(est.asaasSubAccountId)
    const status = await getSubAccountStatus(est.asaasSubAccountId)
    return { documents, status }
  })

  // POST /establishments/me/asaas-documents/:documentId — upload document file to Asaas
  app.post('/me/asaas-documents/:documentId', { preHandler: requireRole('ESTABLISHMENT') }, async (req, reply) => {
    const estId = (req as any).user?.establishmentId
    if (!estId) return reply.status(400).send({ error: 'Conta não vinculada a um estabelecimento.' })
    const est = await prisma.establishment.findUniqueOrThrow({ where: { id: estId } })
    const { documentId } = req.params as { documentId: string }
    const { fileBase64, type, filename, mimeType } = req.body as {
      fileBase64: string; type?: string; filename?: string; mimeType?: string
    }

    if (!est.asaasSubAccountId) {
      return reply.status(400).send({ error: 'Estabelecimento ainda não possui subconta Asaas vinculada.' })
    }
    if (!fileBase64) {
      return reply.status(400).send({ error: 'Arquivo do documento não informado.' })
    }

    const buffer = Buffer.from(fileBase64.replace(/^data:.*;base64,/, ''), 'base64')
    const result = await uploadSubAccountDocument(
      est.asaasSubAccountId,
      documentId,
      type ?? 'COMPANY_PROOF',
      buffer,
      filename ?? `${documentId}.pdf`,
      mimeType ?? 'application/pdf',
    )

    return reply.send({ ok: true, result })
  })

  // GET /establishments/:id
  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.establishment.findUniqueOrThrow({ where: { id } })
  })
}

