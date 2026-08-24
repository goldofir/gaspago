import { FastifyInstance } from 'fastify'
import { requireRole } from '../shared/auth.middleware'
import { In1888EcacService } from './in1888-ecac.service'
import { CnpjAuditorService } from '../shared/cnpj-auditor.service'

export async function ecacAdminRoutes(app: FastifyInstance) {
  const requireAdmin = requireRole('SUPERADMIN', 'ADMIN')

  // GET /admin/ecac/in1888/summary — get monthly volume & threshold status (R$ 30k/month IN 1888)
  app.get('/in1888/summary', { preHandler: requireAdmin }, async (req) => {
    const { year, month } = req.query as { year?: string; month?: string }
    const y = year ? parseInt(year) : undefined
    const m = month ? parseInt(month) : undefined
    return In1888EcacService.getMonthlySummary(y, m)
  })

  // GET /admin/ecac/in1888/export-xml — download official RFB IN 1888 XML for e-CAC submission
  app.get('/in1888/export-xml', { preHandler: requireAdmin }, async (req, reply) => {
    const { year, month } = req.query as { year?: string; month?: string }
    const now = new Date()
    const y = year ? parseInt(year) : now.getFullYear()
    const m = month ? parseInt(month) : now.getMonth() + 1

    const xml = await In1888EcacService.generateXmlIn1888(y, m)

    reply.header('Content-Type', 'application/xml; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="Declaracao_IN1888_${y}_${m.toString().padStart(2, '0')}.xml"`)
    return reply.send(xml)
  })

  // GET /admin/cnpj/audit/:cnpj — 100% free Receita Federal CNPJ audit (BrasilAPI)
  app.get('/cnpj-audit/:cnpj', { preHandler: requireAdmin }, async (req) => {
    const { cnpj } = req.params as { cnpj: string }
    return CnpjAuditorService.auditCnpj(cnpj)
  })
}
