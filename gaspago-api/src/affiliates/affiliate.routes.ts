import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { requireAuth, requireRole } from '../shared/auth.middleware'
import { KycService } from '../kyc/kyc.service'
import { getMatrixDepth } from '../commissions/matrix-placement.service'


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
    const user = await prisma.user.findUnique({ where: { id }, select: { fgolBalance: true, fgolFrozen: true, affiliateStatus: true } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' })
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
    // A stale token (or a stale row somewhere pointing at a deleted account)
    // should read as "not found," not crash the whole request.
    const user = await prisma.user.findUnique({ where: { id }, select: { referralCode: true, referredById: true } })
    if (!user) return reply.status(404).send({ error: 'Usuário não encontrado.' })
    const depth = getMatrixDepth()

    // Most recent cycle only — a member who has re-entered has older, full
    // cycles too, but "my network" is naturally read as the active one.
    const pos = await prisma.matrixPosition.findFirst({ where: { userId: id }, orderBy: { createdAt: 'desc' } })

    // Two genuinely different relationships, both worth showing: who
    // actually invited this person (referredById — never changes) vs. who
    // they landed under in the matrix (may differ once spillover kicks in,
    // e.g. the 6th+ referral of the same sponsor). Fetched separately since
    // referredById has no Prisma relation and the matrix parent is a
    // different row/user entirely from the sponsor.
    const [referredBy, placedUnderPos] = await Promise.all([
      user.referredById
        ? prisma.user.findUnique({ where: { id: user.referredById }, select: { id: true, name: true, phone: true } })
        : null,
      pos?.parentId
        ? prisma.matrixPosition.findUnique({ where: { id: pos.parentId }, select: { userId: true } })
        : null,
    ])
    const placedUnder = placedUnderPos
      ? await prisma.user.findUnique({ where: { id: placedUnderPos.userId }, select: { id: true, name: true, phone: true } })
      : null

    // Level-by-level fetch (one query per depth) instead of a fixed-depth
    // nested include — MATRIX_DEPTH is configurable, so the query shape
    // can't be hardcoded to a specific nesting depth.
    const levelUserIds: string[][] = Array.from({ length: depth }, () => [])
    if (pos) {
      let parentIds = [pos.id]
      for (let level = 0; level < depth && parentIds.length > 0; level++) {
        const children = await prisma.matrixPosition.findMany({
          where: { parentId: { in: parentIds } },
          select: { id: true, userId: true },
        })
        levelUserIds[level] = children.map(c => c.userId)
        parentIds = children.map(c => c.id)
      }
    }

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
      // Same person unless spillover placed this user under someone other
      // than their actual sponsor (the 6th+ referral case) — the frontend
      // shows both, and can note when they match vs. differ.
      referredBy,
      placedUnder,
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

  // GET /affiliates/:id/statement — FGOL statement with expiry info (mobile wallet screen)
  app.get('/:id/statement', { preHandler: requireAuth }, async (req, reply) => {
    if (!requireSelfOrAdmin(req, reply)) return
    const { id } = req.params as { id: string }

    const [user, entries] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id },
        select: { fgolBalance: true, fgolFrozen: true, affiliateStatus: true },
      }),
      prisma.commissionLedger.findMany({
        where: { recipientId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          role: true,
          matrixLevel: true,
          expiresAt: true,
          expiredAt: true,
          blockedAt: true,
          createdAt: true,
        },
      }),
    ])

    const summary = {
      available: Number(user.fgolBalance),
      frozen: Number(user.fgolFrozen),
      affiliateStatus: user.affiliateStatus,
    }

    const items = entries.map(e => ({
      id: e.id,
      amount: Number(e.amount),
      currency: e.currency,
      status: e.status,
      role: e.role,
      matrixLevel: e.matrixLevel,
      expiresAt: e.expiresAt,
      expiredAt: e.expiredAt,
      blockedAt: e.blockedAt,
      createdAt: e.createdAt,
    }))

    return { summary, items }
  })

  // POST /affiliates/withdraw — PIX withdrawal request (HARD ENFORCEMENT: requires KYC Level 2 Verified)
  app.post('/withdraw', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req as any).user.id as string
    const { amount, pixKey } = req.body as { amount: number; pixKey?: string }

    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: 'Valor de saque inválido.' })
    }

    // Trava de KYC Nível Premium: exige kycVerified === true
    await KycService.assertWithdrawalAllowed(userId)

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    if (Number(user.fgolBalance) < amount) {
      return reply.status(400).send({ error: 'Saldo insuficiente para saque.' })
    }

    // Create withdrawal ledger entry & deduct balance atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { fgolBalance: { decrement: amount } },
      }),
      prisma.commissionLedger.create({
        data: {
          recipientId: userId,
          amount: -amount,
          currency: 'FGOL',
          status: 'RELEASED',
          role: 'withdrawal',
        },
      }),
    ])

    return reply.send({ ok: true, message: 'Solicitação de saque enviada com sucesso!' })
  })

  // GET /affiliates/:id/network — matrix tree (SuperAdmin only), most recent cycle
  app.get('/:id/network', { preHandler: requireRole('SUPERADMIN', 'ADMIN') }, async (req) => {
    const { id } = req.params as { id: string }
    const depth = getMatrixDepth()

    const pos = await prisma.matrixPosition.findFirst({ where: { userId: id }, orderBy: { createdAt: 'desc' } })
    if (!pos) return null

    // Nested children up to MATRIX_DEPTH generations, fetched level-by-level
    // (configurable depth, so it can't be a fixed-shape `include`) and then
    // reassembled into the same nested-children shape the include used to
    // produce, since the admin UI reads it that way.
    async function attachChildren(node: any, remaining: number): Promise<any> {
      if (remaining <= 0) return { ...node, children: [] }
      const kids = await prisma.matrixPosition.findMany({ where: { parentId: node.id }, orderBy: { createdAt: 'asc' } })
      const withGrandchildren = await Promise.all(kids.map(k => attachChildren(k, remaining - 1)))
      return { ...node, children: withGrandchildren }
    }

    return attachChildren(pos, depth)
  })
}

