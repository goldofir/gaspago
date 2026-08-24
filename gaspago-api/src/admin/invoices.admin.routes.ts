import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

// Unifies real charges from both payment paths (gas orders + POS/marketplace)
// into one list — the first place in the app where a real Asaas invoice can
// actually be found and browsed instead of only living inside Asaas itself.
export async function invoicesAdminRoutes(app: FastifyInstance) {
  // GET /admin/invoices?paid=&limit=&offset= — paid=true|false filters both
  // Order.paymentStatus and PosPayment.status by their respective "settled"
  // value; the two enums don't share values so filtering by a raw status
  // string wouldn't mean the same thing on both sides.
  app.get('/invoices', async (req, reply) => {
    const { paid, limit, offset } = req.query as { paid?: string; limit?: string; offset?: string }
    const take = limit ? Math.min(Number(limit), 200) : 50
    const skip = offset ? Number(offset) : 0

    const orderWhere: any = { asaasChargeId: { not: null } }
    const posWhere: any = { asaasChargeId: { not: null } }
    if (paid === 'true') {
      orderWhere.paymentStatus = 'PAID'
      posWhere.status = 'PAID'
    } else if (paid === 'false') {
      orderWhere.paymentStatus = { not: 'PAID' }
      posWhere.status = { not: 'PAID' }
    }

    const [orders, posPayments] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: { customer: { select: { name: true, phone: true } }, distributor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: take + skip,
      }),
      prisma.posPayment.findMany({
        where: posWhere,
        include: { customer: { select: { name: true, phone: true } }, establishment: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: take + skip,
      }),
    ])

    const combined = [
      ...orders.map(o => ({
        id: o.id,
        source: 'order' as const,
        party: o.distributor?.name ?? '—',
        customerName: o.customer?.name ?? o.customer?.phone ?? 'Cliente',
        amount: o.total,
        status: o.paymentStatus,
        invoiceUrl: o.invoiceUrl,
        createdAt: o.createdAt,
      })),
      ...posPayments.map(p => ({
        id: p.id,
        source: 'pos' as const,
        party: p.establishment?.name ?? '—',
        customerName: p.customer?.name ?? p.customer?.phone ?? 'Cliente balcão',
        amount: p.pixAmount,
        status: p.status,
        invoiceUrl: p.invoiceUrl,
        createdAt: p.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(skip, skip + take)

    const [totalOrders, totalPos] = await Promise.all([
      prisma.order.count({ where: orderWhere }),
      prisma.posPayment.count({ where: posWhere }),
    ])

    return reply.send({ invoices: combined, total: totalOrders + totalPos })
  })
}
