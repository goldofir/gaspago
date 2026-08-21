import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

export async function subscriptionsAdminRoutes(app: FastifyInstance) {
  // GET /subscriptions/stats
  app.get('/subscriptions/stats', async (_req, reply) => {
    const [total, active, cancelled] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { plan: 'PREMIUM', isActive: true } }),
      prisma.subscription.count({ where: { isActive: false } }),
    ])

    return reply.send({
      total,
      active,
      cancelled,
      mrr: parseFloat((active * 29.90).toFixed(2)),
    })
  })

  // GET /subscriptions — query: limit=100, offset=0
  app.get('/subscriptions', async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string }
    const limit = parseInt(query.limit ?? '100', 10)
    const offset = parseInt(query.offset ?? '0', 10)

    const subscriptions = await prisma.subscription.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })

    const userIds = subscriptions.map((s: any) => s.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, phone: true, email: true },
    })
    const userMap: Record<string, any> = Object.fromEntries(users.map((u: any) => [u.id, u]))
    const result = subscriptions.map((s: any) => ({ ...s, user: userMap[s.userId] ?? null }))

    return reply.send({ subscriptions: result })
  })
}
