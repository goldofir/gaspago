import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

export async function revenueRoutes(app: FastifyInstance) {
  // GET /admin/revenue — revenue grouped by source + currency
  app.get('/revenue', async () => {
    const totals = await prisma.companyRevenue.groupBy({
      by: ['source', 'currency'],
      _sum: { amount: true },
    })
    return totals
  })

  // GET /admin/revenue/summary — aggregate totals + buyback count
  app.get('/revenue/summary', async () => {
    const [brlAgg, fgolAgg, buybackCount] = await Promise.all([
      prisma.companyRevenue.aggregate({
        where: { currency: 'BRL' },
        _sum: { amount: true },
      }),
      prisma.companyRevenue.aggregate({
        where: { currency: 'FGOL' },
        _sum: { amount: true },
      }),
      prisma.buybackBatch.count(),
    ])

    return {
      totalBrl: brlAgg._sum.amount ?? 0,
      totalFgol: fgolAgg._sum.amount ?? 0,
      buybackCount,
    }
  })

  // GET /admin/revenue/buybacks — last 20 buyback batches
  app.get('/revenue/buybacks', async () => {
    const batches = await prisma.buybackBatch.findMany({
      orderBy: { executedAt: 'desc' },
      take: 20,
    })
    return batches
  })
}
