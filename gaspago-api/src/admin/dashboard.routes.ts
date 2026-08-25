import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

type DayCount = { day: Date; count: number }
type DaySum = { day: Date; total: number | null }

// Fills in zero-value days so the chart doesn't skip gaps where nothing
// happened — SQL GROUP BY only returns rows for days that had activity.
function fillDays(rows: { day: Date; value: number }[], days: number): { date: string; value: number }[] {
  const byDay = new Map(rows.map(r => [r.day.toISOString().slice(0, 10), r.value]))
  const out: { date: string; value: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, value: byDay.get(key) ?? 0 })
  }
  return out
}

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /admin/dashboard — every KPI + time series the SuperAdmin overview needs,
  // one call. Kept as raw aggregate/groupBy queries (no N+1) so this stays cheap
  // even as the platform grows.
  app.get('/dashboard', async () => {
    const DAYS = 30
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      activeAffiliates,
      totalOrders,
      totalDistributors,
      activeDistributors,
      totalEstablishments,
      activeEstablishments,
      activeSubscriptions,
      networkSize,
      ordersByStatus,
      gmvOrders,
      gmvPos,
      revenueAgg,
      commissionsPaidAgg,
      ordersPerDayRaw,
      usersPerDayRaw,
      revenuePerDayRaw,
      topDistributors,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { affiliateStatus: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.distributor.count(),
      prisma.distributor.count({ where: { isActive: true } }),
      prisma.establishment.count(),
      prisma.establishment.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
      prisma.matrixPosition.count(),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.posPayment.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
      // FGOL:BRL is treated 1:1 everywhere else in this platform (no separate
      // exchange rate) — summed together here into one "receita" figure. The
      // /admin/revenue page keeps the detailed per-currency breakdown.
      prisma.companyRevenue.aggregate({ _sum: { amount: true } }),
      prisma.commissionLedger.aggregate({ where: { status: 'RELEASED' }, _sum: { amount: true } }),
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") as day, count(*)::int as count
        FROM "Order" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<DayCount[]>`
        SELECT date_trunc('day', "createdAt") as day, count(*)::int as count
        FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<DaySum[]>`
        SELECT date_trunc('day', "createdAt") as day, sum(amount)::float as total
        FROM "CompanyRevenue" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`,
      prisma.order.groupBy({
        by: ['distributorId'],
        where: { paymentStatus: 'PAID' },
        _count: { _all: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true, status: true, total: true, createdAt: true,
          customer: { select: { name: true, phone: true } },
          distributor: { select: { name: true } },
        },
      }),
    ])

    const distributorIds = topDistributors.map(d => d.distributorId)
    const distributorNames = distributorIds.length > 0
      ? await prisma.distributor.findMany({ where: { id: { in: distributorIds } }, select: { id: true, name: true } })
      : []
    const nameById = new Map(distributorNames.map(d => [d.id, d.name]))

    return {
      kpis: {
        totalUsers,
        activeAffiliates,
        totalOrders,
        totalDistributors,
        activeDistributors,
        totalEstablishments,
        activeEstablishments,
        activeSubscriptions,
        networkSize,
        gmv: Number(gmvOrders._sum.total ?? 0) + Number(gmvPos._sum.totalAmount ?? 0),
        companyRevenue: Number(revenueAgg._sum.amount ?? 0),
        commissionsPaid: Number(commissionsPaidAgg._sum.amount ?? 0),
      },
      ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: o._count._all })),
      series: {
        ordersPerDay: fillDays(ordersPerDayRaw.map(r => ({ day: r.day, value: r.count })), DAYS),
        usersPerDay: fillDays(usersPerDayRaw.map(r => ({ day: r.day, value: r.count })), DAYS),
        revenuePerDay: fillDays(revenuePerDayRaw.map(r => ({ day: r.day, value: r.total ?? 0 })), DAYS),
      },
      topDistributors: topDistributors.map(d => ({
        id: d.distributorId,
        name: nameById.get(d.distributorId) ?? '—',
        orders: d._count._all,
        revenue: Number(d._sum.total ?? 0),
      })),
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        status: o.status,
        total: Number(o.total),
        createdAt: o.createdAt,
        customerName: o.customer?.name ?? o.customer?.phone ?? '—',
        distributorName: o.distributor?.name ?? '—',
      })),
    }
  })
}
