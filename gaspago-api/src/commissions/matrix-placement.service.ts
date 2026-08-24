import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'

const DEFAULT_WIDTH = 5
const DEFAULT_DEPTH = 5

export function getMatrixWidth(): number {
  const v = Number(SystemConfigService.get('MATRIX_WIDTH'))
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_WIDTH
}

export function getMatrixDepth(): number {
  const v = Number(SystemConfigService.get('MATRIX_DEPTH'))
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_DEPTH
}

// Forced matrix placement: a new referral goes into the referrer's own line
// while there's room (up to MATRIX_WIDTH direct slots). Once full, the next
// referral spills down to whichever descendant — oldest first, own line
// before spilling deeper — still has an empty slot. This is a standard
// breadth-first "oldest incomplete node" search: the queue preserves
// discovery order, so the first node dequeued with room is always the
// longest-standing one at the shallowest level that isn't full yet.
// The tree itself has no depth cap — it keeps growing as referrals pile up.
// MATRIX_DEPTH only bounds how many ancestor levels distributeCommissions
// pays out for, not how deep the tree can physically get.
export async function placeInMatrix(newUserId: string, referrerId: string): Promise<void> {
  const width = getMatrixWidth()

  let referrerPos = await prisma.matrixPosition.findUnique({ where: { userId: referrerId } })
  if (!referrerPos) {
    referrerPos = await prisma.matrixPosition.create({
      data: { userId: referrerId, parentId: null, level: 1, position: 1, path: referrerId },
    })
  }

  const queue: string[] = [referrerPos.id]
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = await prisma.matrixPosition.findUniqueOrThrow({ where: { id: nodeId } })
    const children = await prisma.matrixPosition.findMany({
      where: { parentId: nodeId },
      orderBy: { createdAt: 'asc' },
    })
    if (children.length < width) {
      await prisma.matrixPosition.create({
        data: {
          userId: newUserId,
          parentId: nodeId,
          level: node.level + 1,
          position: children.length + 1,
          path: `${node.path}.${children.length + 1}`,
        },
      })
      return
    }
    queue.push(...children.map(c => c.id))
  }
}

// Walks up from a user's own matrix node, collecting up to `depth` ancestor
// userIds — closest first. One query per level; fine at the depths this
// feature is configured for (single digits), and only runs when an order
// actually settles, not on any hot path.
export async function collectAncestorUserIds(userId: string, depth: number): Promise<string[]> {
  const out: string[] = []
  const own = await prisma.matrixPosition.findUnique({ where: { userId }, select: { parentId: true } })
  let parentId = own?.parentId ?? null
  while (parentId && out.length < depth) {
    const parent = await prisma.matrixPosition.findUnique({ where: { id: parentId }, select: { userId: true, parentId: true } })
    if (!parent) break
    out.push(parent.userId)
    parentId = parent.parentId
  }
  return out
}
