import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { requireRole } from '../shared/auth.middleware'

async function getMeCredenciador(userId?: string) {
  if (!userId) {
    throw Object.assign(new Error('Não autenticado.'), { statusCode: 401 })
  }
  const u = await prisma.user.findUnique({ where: { id: userId } })
  if (!u) {
    throw Object.assign(new Error('Usuário não encontrado.'), { statusCode: 404 })
  }
  return u
}

const requireCredenciador = requireRole('CREDENCIADOR')

export async function credenciadorRoutes(app: FastifyInstance) {
  // GET /credenciador/me/stats — dashboard cards
  app.get('/me/stats', { preHandler: requireCredenciador }, async (req) => {
    const cred = await getMeCredenciador((req as any).user?.id)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [activeDistributors, totalEstablishments, monthlyComm, releasedComm] = await Promise.all([
      prisma.distributor.count({ where: { credenciadorId: cred.id, isActive: true } }),
      prisma.establishment.count({ where: { credenciadorId: cred.id } }),
      prisma.commissionLedger.aggregate({
        where: { recipientId: cred.id, createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.commissionLedger.aggregate({
        where: { recipientId: cred.id, status: 'RELEASED' },
        _sum: { amount: true },
      }),
    ])

    return {
      activeDistributors,
      totalEstablishments,
      monthlyCommissions: Number(monthlyComm._sum.amount ?? 0),
      releasedCommissions: Number(releasedComm._sum.amount ?? 0),
    }
  })

  // GET /credenciador/me/commissions/weekly — 4 weeks chart
  app.get('/me/commissions/weekly', { preHandler: requireCredenciador }, async (req) => {
    const cred = await getMeCredenciador((req as any).user?.id)

    const weeks = []
    for (let i = 3; i >= 0; i--) {
      const end = new Date(Date.now() - i * 7 * 86400_000)
      const start = new Date(end.getTime() - 7 * 86400_000)

      const agg = await prisma.commissionLedger.aggregate({
        where: { recipientId: cred.id, createdAt: { gte: start, lt: end } },
        _sum: { amount: true },
      })

      weeks.push({
        week: `Sem -${i}`,
        amount: Number(agg._sum.amount ?? 0),
      })
    }
    return weeks
  })

  // GET /credenciador/me/activity — recent onboarded entities
  app.get('/me/activity', { preHandler: requireCredenciador }, async (req) => {
    const cred = await getMeCredenciador((req as any).user?.id)
    const limit = parseInt((req.query as any)?.limit ?? '5')

    const [distributors, establishments] = await Promise.all([
      prisma.distributor.findMany({ where: { credenciadorId: cred.id }, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.establishment.findMany({ where: { credenciadorId: cred.id }, take: limit, orderBy: { createdAt: 'desc' } }),
    ])

    const combined = [
      ...distributors.map(d => ({ id: d.id, type: 'distributor' as const, name: d.name, createdAt: d.createdAt })),
      ...establishments.map(e => ({ id: e.id, type: 'establishment' as const, name: e.name, createdAt: e.createdAt })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)

    return combined
  })

  // GET /credenciador/me/distributors — list distributors
  app.get('/me/distributors', { preHandler: requireCredenciador }, async (req) => {
    const cred = await getMeCredenciador((req as any).user?.id)
    return prisma.distributor.findMany({
      where: { credenciadorId: cred.id },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  // GET /credenciador/me/establishments — list establishments
  app.get('/me/establishments', { preHandler: requireCredenciador }, async (req) => {
    const cred = await getMeCredenciador((req as any).user?.id)
    return prisma.establishment.findMany({
      where: { credenciadorId: cred.id },
      orderBy: { createdAt: 'desc' },
    })
  })

  // GET /credenciador/me/commissions — commission ledger entries
  app.get('/me/commissions', { preHandler: requireCredenciador }, async (req) => {
    const cred = await getMeCredenciador((req as any).user?.id)
    const limit = parseInt((req.query as any)?.limit ?? '100')

    return prisma.commissionLedger.findMany({
      where: { recipientId: cred.id },
      include: {
        order: { include: { distributor: { select: { name: true } } } },
        posPayment: { include: { establishment: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  })
}
