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

// A member's most recent matrix position — the one new referrals/spillover
// get placed into. Older, fully-saturated cycles (see re-entry below) stay
// in the tree exactly as they are; they just stop receiving new placements.
async function getActivePosition(userId: string) {
  return prisma.matrixPosition.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } })
}

async function createRootPosition(userId: string) {
  const pos = await prisma.matrixPosition.create({
    data: { userId, parentId: null, level: 1, position: 1, path: '' },
  })
  // path needs the row's own id, which only exists after insert.
  return prisma.matrixPosition.update({ where: { id: pos.id }, data: { path: pos.id } })
}

// Depth-bounded breadth-first search for the oldest node — starting at
// `rootPos` — that still has an open child slot, capped at MATRIX_DEPTH
// generations of descendants BELOW rootPos specifically (matching the
// 5¹+5²+…+5^depth capacity of a real forced-matrix cycle). Every affiliate
// gets their own full-depth matrix rooted at themselves, no matter how deep
// they themselves sit inside an ancestor's matrix — so this tracks depth
// relative to rootPos (a separate BFS counter), not MatrixPosition.level,
// which is absolute from whatever cycle's own root. Using the absolute
// level here would shrink a deeply-nested affiliate's own matrix down to
// however many generations were "left over" from their ancestor's depth
// budget, instead of giving them the full configured depth — inconsistent
// with collectAncestorUserIds, which already counts relative to whoever's
// paying, not from some distant root. Returns true if it placed the new
// member, false if this cycle is completely saturated.
async function tryPlaceInCycle(rootPos: { id: string }, newUserId: string, width: number, depth: number): Promise<boolean> {
  const queue: { id: string; relativeLevel: number }[] = [{ id: rootPos.id, relativeLevel: 1 }]
  while (queue.length > 0) {
    const { id: nodeId, relativeLevel } = queue.shift()!
    // relativeLevel counts rootPos itself as 1 — a node can only sponsor
    // children while it's within the first `depth` generations below
    // rootPos; the (depth+1)th generation is the deepest paid tier and is a
    // dead end for further placement in this cycle.
    if (relativeLevel > depth) continue

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
      return true
    }
    queue.push(...children.map(c => ({ id: c.id, relativeLevel: relativeLevel + 1 })))
  }
  return false
}

// Forced matrix placement, width x depth both configurable. A new referral
// goes into the referrer's current cycle while there's room anywhere within
// it (own line first, then spillover to the oldest incomplete descendant —
// see tryPlaceInCycle). Once that whole cycle is saturated — every slot
// through the deepest paid generation is taken — the referrer re-enters as
// a fresh root (a new, independent MatrixPosition) and the new referral
// starts that cycle's line 1. Older cycles are untouched: they stay full,
// still paying out to whoever's above them in the tree.
export async function placeInMatrix(newUserId: string, referrerId: string): Promise<void> {
  const width = getMatrixWidth()

  const referrer = await prisma.user.findUnique({ where: { id: referrerId }, select: { isCompanyRoot: true } })

  // The company root (affiliate #1 — see User.isCompanyRoot) never
  // saturates-and-re-enters like every other affiliate: its placement search
  // has no depth ceiling, so it always finds room somewhere in its one and
  // only tree. This is what lets the whole organic network (everyone with no
  // real referrer, see resolveReferrer below) keep growing under a single
  // root forever instead of fragmenting into disconnected cycles.
  const depth = referrer?.isCompanyRoot ? Number.POSITIVE_INFINITY : getMatrixDepth()

  let activePos = await getActivePosition(referrerId)
  if (!activePos) {
    activePos = await createRootPosition(referrerId)
  }

  const placed = await tryPlaceInCycle(activePos, newUserId, width, depth)
  if (placed) return

  const newCycle = await createRootPosition(referrerId)
  const placedInNewCycle = await tryPlaceInCycle(newCycle, newUserId, width, depth)
  if (!placedInNewCycle) {
    // Only reachable if width/depth is misconfigured to 0 mid-request — a
    // brand new empty root always has room for at least one child.
    throw new Error(`[matrix] failed to place ${newUserId} even in a fresh cycle for ${referrerId}`)
  }
}

// Resolves who a new signup's referrer actually is: the explicit ?ref= code
// if it's valid, otherwise the company root (User.isCompanyRoot — set from
// SuperAdmin -> Rede) — so everyone ends up in the network somewhere, never
// with no matrix position at all, even with no referral link. Returns null
// only if there's truly nothing to fall back to (explicit ref invalid AND no
// company root configured yet) or it resolves to the person signing up.
export async function resolveReferrer(explicitRef: string | undefined, newUserId: string) {
  if (explicitRef) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: explicitRef } })
    if (referrer && referrer.id !== newUserId) return referrer
  }
  const companyRoot = await prisma.user.findFirst({ where: { isCompanyRoot: true } })
  if (!companyRoot || companyRoot.id === newUserId) return null
  return companyRoot
}

// Walks up from a user's own (most recent) matrix position, collecting up
// to `depth` ancestor userIds — closest first. One query per level; fine at
// the depths this feature is configured for, and only runs when an order
// actually settles, not on any hot path.
export async function collectAncestorUserIds(userId: string, depth: number): Promise<string[]> {
  const out: string[] = []
  const own = await getActivePosition(userId)
  let parentId = own?.parentId ?? null
  while (parentId && out.length < depth) {
    const parent = await prisma.matrixPosition.findUnique({ where: { id: parentId }, select: { userId: true, parentId: true } })
    if (!parent) break
    out.push(parent.userId)
    parentId = parent.parentId
  }
  return out
}
