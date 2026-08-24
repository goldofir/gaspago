import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { requireAuth, requireRole } from '../shared/auth.middleware'

// These are consumer self-service endpoints (FGOL balance, commission ledger,
// referral network) but none of them checked that the caller actually owns
// the :id they're requesting — any authenticated (or, before requireAuth was
// added, ANY) caller could read another user's wallet balance, commission
// history, or downline by guessing/obtaining their id. Enforced below instead
// of trusting the URL param.
function requireSelfOrAdmin(req: any, reply: any) {
  const { id } = req.params as { id: string }
  if (req.user?.id !== id && !['SUPERADMIN', 'ADMIN'].includes(req.user?.role)) {
    reply.status(403).send({ error: 'Acesso negado' })
    return false
  }
  return true
}

export async function affiliateRoutes(app: FastifyInstance) {
  // GET /affiliates/:id/wallet — FGOL balance + frozen
  app.get('/:id/wallet', { preHandler: requireAuth }, async (req, reply) => {
    if (!requireSelfOrAdmin(req, reply)) return
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { fgolBalance: true, fgolFrozen: true, affiliateStatus: true } })
    // FGOL:BRL is treated as 1:1 everywhere else in the platform (there's no
    // separate exchange rate) — the mobile app's wallet/home screens expect
    // this field and previously always showed R$ 0,00 without it.
    return { ...user, brlEquivalent: Number(user.fgolBalance) }
  })

  // GET /affiliates/:id/matrix — mobile "Minha Rede" screen: per-level network
  // counts and earnings for the logged-in user's own downline.
  app.get('/:id/matrix', { preHandler: requireAuth }, async (req, reply) => {
    if (!requireSelfOrAdmin(req, reply)) return
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { referralCode: true } })

    const pos = await prisma.matrixPosition.findUnique({
      where: { userId: id },
      include: {
        children: { include: { children: { include: { children: { include: { children: { include: { children: true } } } } } } } },
      },
    })

    const levelUserIds: string[][] = [[], [], [], [], []]
    const walk = (node: any, depth: number) => {
      for (const child of node?.children ?? []) {
        if (depth <= 5) levelUserIds[depth - 1].push(child.userId)
        walk(child, depth + 1)
      }
    }
    if (pos) walk(pos, 1)

    const allIds = levelUserIds.flat()
    const activeUsers = allIds.length
      ? await prisma.user.findMany({ where: { id: { in: allIds }, affiliateStatus: 'ACTIVE' }, select: { id: true } })
      : []
    const activeSet = new Set(activeUsers.map(u => u.id))

    const earnings = await prisma.commissionLedger.groupBy({
      by: ['matrixLevel'],
      where: { recipientId: id, matrixLevel: { not: null } },
      _sum: { amount: true },
    })
    const earnedByLevel = new Map(earnings.map(e => [e.matrixLevel, Number(e._sum.amount ?? 0)]))

    const levels = levelUserIds.map((ids, i) => ({
      level: i + 1,
      count: ids.length,
      activeCount: ids.filter(uid => activeSet.has(uid)).length,
      earned: earnedByLevel.get(i + 1) ?? 0,
    }))

    return {
      levels,
      totalEarned: levels.reduce((sum, l) => sum + l.earned, 0),
      referralCode: user.referralCode,
      referralLink: `https://gaspago.app/?ref=${user.referralCode}`,
    }
  })

  // GET /affiliates/:id/commissions — commission ledger
  app.get('/:id/commissions', { preHandler: requireAuth }, async (req, reply) => {
    if (!requireSelfOrAdmin(req, reply)) return
    const { id } = req.params as { id: string }
    return prisma.commissionLedger.findMany({
      where: { recipientId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  })

  // GET /affiliates/:id/network — matrix tree (SuperAdmin only)
  app.get('/:id/network', { preHandler: requireRole('SUPERADMIN', 'ADMIN') }, async (req) => {
    const { id } = req.params as { id: string }
    const pos = await prisma.matrixPosition.findUnique({
      where: { userId: id },
      include: {
        children: { include: { children: { include: { children: { include: { children: { include: { children: true } } } } } } } },
      },
    })
    return pos
  })
}
