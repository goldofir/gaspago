import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { requireAuth } from '../shared/auth.middleware'
import { requireAdminAuth } from '../admin/admin.middleware'
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
  // Two unrelated JWT conventions can land here: the consumer-facing one
  // (User.actorType, uppercase 'SUPERADMIN'/'ADMIN') and the admin panel's
  // own (lowercase 'superadmin'/'admin', signed in admin/auth.routes.ts).
  // Checking only one class silently 403s the other, which is exactly what
  // happened here before this fix — SuperAdmin browsing anyone else's
  // wallet/matrix from the admin UI always failed, only self-access worked.
  const role = String(req.user?.role ?? '')
  const isAdmin = ['SUPERADMIN', 'ADMIN'].includes(role) || ['superadmin', 'admin'].includes(role)
  if (req.user?.id !== id && !isAdmin) {
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

  // GET /affiliates/roots — every top-level matrix root (SuperAdmin's entry
  // point into "browse the whole network" — pick a root, drill into its tree
  // via /:id/network below). A user can have more than one root (re-entry
  // cycles), so this lists cycles, not users — dedupe client-side if needed.
  app.get('/roots', { preHandler: requireAdminAuth }, async (req) => {
    const roots = await prisma.matrixPosition.findMany({
      where: { parentId: null },
      orderBy: { createdAt: 'asc' },
    })
    if (roots.length === 0) return []

    const userIds = roots.map(r => r.userId)
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true, actorType: true } })
    const userById = new Map(users.map(u => [u.id, u]))

    // Direct + total descendant counts, one query per depth level across ALL
    // roots at once (batched, not per-root) — same level-by-level pattern as
    // /:id/matrix, just fanned out over multiple starting points.
    const depth = getMatrixDepth()
    const totalByRoot = new Map(roots.map(r => [r.id, 0]))
    const directByRoot = new Map(roots.map(r => [r.id, 0]))
    let frontier = roots.map(r => ({ rootId: r.id, posId: r.id }))
    for (let level = 0; level < depth && frontier.length > 0; level++) {
      const children = await prisma.matrixPosition.findMany({
        where: { parentId: { in: frontier.map(f => f.posId) } },
        select: { id: true, parentId: true },
      })
      const parentToRoot = new Map(frontier.map(f => [f.posId, f.rootId]))
      const nextFrontier: typeof frontier = []
      for (const child of children) {
        const rootId = parentToRoot.get(child.parentId!)!
        totalByRoot.set(rootId, (totalByRoot.get(rootId) ?? 0) + 1)
        if (level === 0) directByRoot.set(rootId, (directByRoot.get(rootId) ?? 0) + 1)
        nextFrontier.push({ rootId, posId: child.id })
      }
      frontier = nextFrontier
    }

    return roots.map(r => ({
      matrixPositionId: r.id,
      userId: r.userId,
      name: userById.get(r.userId)?.name ?? null,
      phone: userById.get(r.userId)?.phone ?? '',
      actorType: userById.get(r.userId)?.actorType ?? null,
      directCount: directByRoot.get(r.id) ?? 0,
      totalCount: totalByRoot.get(r.id) ?? 0,
      createdAt: r.createdAt,
    }))
  })

  // GET /affiliates/:id/network — matrix tree (SuperAdmin only), most recent cycle
  app.get('/:id/network', { preHandler: requireAdminAuth }, async (req) => {
    const { id } = req.params as { id: string }
    const depth = getMatrixDepth()

    const pos = await prisma.matrixPosition.findFirst({ where: { userId: id }, orderBy: { createdAt: 'desc' } })
    if (!pos) return null

    // Level-by-level fetch (one query per depth, not per node) instead of the
    // old per-node recursive version — same pattern as /:id/matrix. Names/
    // phones are fetched in the same batches so the tree renders without a
    // client-side waterfall of per-node lookups.
    const nodesById = new Map<string, any>([[pos.id, { ...pos, children: [] }]])
    let parentIds = [pos.id]
    for (let level = 0; level < depth && parentIds.length > 0; level++) {
      const children = await prisma.matrixPosition.findMany({
        where: { parentId: { in: parentIds } },
        orderBy: { createdAt: 'asc' },
      })
      for (const child of children) {
        nodesById.set(child.id, { ...child, children: [] })
      }
      parentIds = children.map(c => c.id)
    }

    const userIds = [...nodesById.values()].map(n => n.userId)
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true, affiliateStatus: true } })
    const userById = new Map(users.map(u => [u.id, u]))
    for (const node of nodesById.values()) {
      const u = userById.get(node.userId)
      node.name = u?.name ?? null
      node.phone = u?.phone ?? ''
      node.affiliateStatus = u?.affiliateStatus ?? null
    }

    // Reassemble the flat map into the nested {children:[...]} shape the UI expects.
    for (const node of nodesById.values()) {
      if (node.parentId && nodesById.has(node.parentId)) {
        nodesById.get(node.parentId)!.children.push(node)
      }
    }

    return nodesById.get(pos.id)
  })
}

