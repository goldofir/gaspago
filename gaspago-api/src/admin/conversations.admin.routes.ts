import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

export async function conversationsAdminRoutes(app: FastifyInstance) {
  // GET /admin/conversations — one row per phone number, most recent message first.
  // Dedupes in memory (fine at this volume) rather than a window-function query —
  // revisit with a raw SQL DISTINCT ON if message volume grows large.
  app.get('/conversations', async (_req, reply) => {
    const recent = await prisma.waMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    const seen = new Set<string>()
    const conversations: { phone: string; lastMessage: string; lastDirection: string; lastAt: Date; messageCount: number }[] = []
    const countByPhone = new Map<string, number>()
    for (const m of recent) countByPhone.set(m.phone, (countByPhone.get(m.phone) ?? 0) + 1)

    for (const m of recent) {
      if (seen.has(m.phone)) continue
      seen.add(m.phone)
      conversations.push({
        phone: m.phone,
        lastMessage: m.text,
        lastDirection: m.direction,
        lastAt: m.createdAt,
        messageCount: countByPhone.get(m.phone) ?? 1,
      })
    }

    return reply.send({ conversations })
  })

  // GET /admin/conversations/:phone — full thread, oldest first
  app.get('/conversations/:phone', async (req, reply) => {
    const { phone } = req.params as { phone: string }
    const messages = await prisma.waMessage.findMany({
      where: { phone },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    return reply.send({ phone, messages })
  })
}
