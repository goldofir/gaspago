import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

export async function affiliateRoutes(app: FastifyInstance) {
  // GET /affiliates/:id/wallet — FGOL balance + frozen
  app.get('/:id/wallet', async (req) => {
    const { id } = req.params as { id: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { fgolBalance: true, fgolFrozen: true, affiliateStatus: true } })
    return user
  })

  // GET /affiliates/:id/commissions — commission ledger
  app.get('/:id/commissions', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.commissionLedger.findMany({
      where: { recipientId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  })

  // GET /affiliates/:id/network — matrix tree (SuperAdmin only — enforced in middleware)
  app.get('/:id/network', async (req) => {
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
