import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'

const COMPANY_KEYS = [
  'COMPANY_RAZAO_SOCIAL',
  'COMPANY_CNPJ',
  'COMPANY_IE',
  'COMPANY_EMAIL',
  'COMPANY_PHONE',
  'COMPANY_ADDRESS',
  'COMPANY_RESPONSAVEL_NOME',
  'COMPANY_RESPONSAVEL_CPF',
  'COMPANY_TREASURY_WALLET',
] as const

export async function companyAdminRoutes(app: FastifyInstance) {
  // GET /admin/company — Get company profile
  app.get('/company', async () => {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: [...COMPANY_KEYS] } },
    })

    const map = Object.fromEntries(configs.map((c) => [c.key, c.value]))

    return {
      razaoSocial: map['COMPANY_RAZAO_SOCIAL'] ?? 'GÁS PAGO TECNOLOGIA LTDA',
      cnpj: map['COMPANY_CNPJ'] ?? '00.000.000/0001-00',
      inscricaoEstadual: map['COMPANY_IE'] ?? 'ISENTO',
      email: map['COMPANY_EMAIL'] ?? 'contato@gaspago.com.br',
      phone: map['COMPANY_PHONE'] ?? '(11) 99999-9999',
      address: map['COMPANY_ADDRESS'] ?? 'Av. Paulista, 1000 - São Paulo/SP',
      responsavelNome: map['COMPANY_RESPONSAVEL_NOME'] ?? 'Administrador Principal',
      responsavelCpf: map['COMPANY_RESPONSAVEL_CPF'] ?? '000.000.000-00',
      treasuryWallet: map['COMPANY_TREASURY_WALLET'] ?? '0x0000000000000000000000000000000000000000',
    }
  })

  // POST /admin/company — Update company profile
  app.post('/company', async (req, reply) => {
    const body = req.body as {
      razaoSocial?: string
      cnpj?: string
      inscricaoEstadual?: string
      email?: string
      phone?: string
      address?: string
      responsavelNome?: string
      responsavelCpf?: string
      treasuryWallet?: string
    }

    const updates: { key: string; value: string }[] = []

    if (body.razaoSocial !== undefined) updates.push({ key: 'COMPANY_RAZAO_SOCIAL', value: body.razaoSocial })
    if (body.cnpj !== undefined) updates.push({ key: 'COMPANY_CNPJ', value: body.cnpj })
    if (body.inscricaoEstadual !== undefined) updates.push({ key: 'COMPANY_IE', value: body.inscricaoEstadual })
    if (body.email !== undefined) updates.push({ key: 'COMPANY_EMAIL', value: body.email })
    if (body.phone !== undefined) updates.push({ key: 'COMPANY_PHONE', value: body.phone })
    if (body.address !== undefined) updates.push({ key: 'COMPANY_ADDRESS', value: body.address })
    if (body.responsavelNome !== undefined) updates.push({ key: 'COMPANY_RESPONSAVEL_NOME', value: body.responsavelNome })
    if (body.responsavelCpf !== undefined) updates.push({ key: 'COMPANY_RESPONSAVEL_CPF', value: body.responsavelCpf })
    if (body.treasuryWallet !== undefined) updates.push({ key: 'COMPANY_TREASURY_WALLET', value: body.treasuryWallet })

    for (const item of updates) {
      await SystemConfigService.set(item.key, item.value, 'Dados institucionais da empresa Gás Pago')
    }

    return reply.send({ ok: true, message: 'Dados da empresa atualizados com sucesso!' })
  })
}
