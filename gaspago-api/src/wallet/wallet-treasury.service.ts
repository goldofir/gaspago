import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'
import { config } from '../config'

// FGOL and BRL are tracked 1:1 throughout the commission engine (see scheduler.ts)
// — no price oracle needed to compare a BRL threshold against an FGOL amount.

const DEFAULT_BATCH_THRESHOLD_BRL = 10
const DEFAULT_MIN_PIX_WITHDRAWAL_BRL = 20

export function getOnChainBatchThreshold(): number {
  const v = SystemConfigService.get('FGOL_ONCHAIN_BATCH_THRESHOLD_BRL')
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_BATCH_THRESHOLD_BRL
}

export function getMinPixWithdrawal(): number {
  const v = SystemConfigService.get('FGOL_MIN_PIX_WITHDRAWAL_BRL')
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_PIX_WITHDRAWAL_BRL
}

function isTreasuryConfigured(): boolean {
  return !!(config.polygon.rpcUrl && config.polygon.fgolContract && config.polygon.platformWalletKey)
}

/**
 * Queues a treasury -> user on-chain transfer. Never sends the transaction inline —
 * a separate worker (processOnChainQueue) drains PENDING rows. Called by the batch
 * cron once a user's pendingOnChainAmount crosses the configured threshold.
 */
async function queueTreasuryPush(userId: string, amount: number, reason: string, referenceId?: string) {
  return prisma.onChainTransfer.create({
    data: { userId, direction: 'TO_USER', amount, reason, referenceId },
  })
}

/**
 * Queues a user -> treasury pull-back (via the wallet's one-time approve/transferFrom
 * allowance). Called synchronously alongside a PIX/marketplace debit, but the actual
 * on-chain transfer is processed later by the worker — it never blocks the payment.
 */
export async function queueRedemptionPullback(userId: string, amount: number, reason: string, referenceId?: string) {
  if (amount <= 0) return null
  return prisma.onChainTransfer.create({
    data: { userId, direction: 'FROM_USER', amount, reason, referenceId },
  })
}

/**
 * Runs periodically. Finds users whose accumulated-but-not-yet-on-chain earnings
 * crossed the configured threshold, and queues one consolidated transfer for the
 * whole accumulated amount — avoids a transaction per small commission.
 */
export async function flushPendingOnChainTransfers(): Promise<{ usersFlushed: number; totalAmount: number }> {
  const threshold = getOnChainBatchThreshold()

  const candidates = await prisma.user.findMany({
    where: { pendingOnChainAmount: { gte: threshold }, walletAddress: { not: null } },
    select: { id: true, pendingOnChainAmount: true },
  })

  let totalAmount = 0
  for (const u of candidates) {
    const amount = Number(u.pendingOnChainAmount)
    if (amount <= 0) continue

    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { pendingOnChainAmount: { decrement: amount } } }),
      prisma.onChainTransfer.create({
        data: { userId: u.id, direction: 'TO_USER', amount, reason: 'commission_batch' },
      }),
    ])
    totalAmount += amount
  }

  return { usersFlushed: candidates.length, totalAmount }
}

/**
 * Drains PENDING OnChainTransfer rows and submits the real Polygon transaction.
 * Mirrors the safe-skip pattern already used by web3/buyback.service.ts: with no
 * treasury key configured, rows stay PENDING (never silently marked CONFIRMED) and
 * a warning is logged once per run instead of failing the whole batch.
 */
export async function processOnChainQueue(): Promise<{ processed: number; confirmed: number; failed: number }> {
  const pending = await prisma.onChainTransfer.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { walletAddress: true, walletApprovedAt: true } } },
    take: 50,
    orderBy: { createdAt: 'asc' },
  })

  if (pending.length === 0) return { processed: 0, confirmed: 0, failed: 0 }

  if (!isTreasuryConfigured()) {
    console.warn(`[wallet-treasury] ${pending.length} on-chain transfer(s) queued but PLATFORM_WALLET_KEY is not configured — skipping. Configure it in SuperAdmin → Credenciais.`)
    return { processed: 0, confirmed: 0, failed: 0 }
  }

  let confirmed = 0
  let failed = 0

  for (const transfer of pending) {
    if (!transfer.user.walletAddress) {
      await prisma.onChainTransfer.update({
        where: { id: transfer.id },
        data: { status: 'FAILED', error: 'User has no walletAddress provisioned yet' },
      })
      failed++
      continue
    }
    if (transfer.direction === 'FROM_USER' && !transfer.user.walletApprovedAt) {
      await prisma.onChainTransfer.update({
        where: { id: transfer.id },
        data: { status: 'FAILED', error: 'User has not signed the treasury allowance approve() yet' },
      })
      failed++
      continue
    }

    // Real Polygon submission (contract.transfer for TO_USER, contract.transferFrom
    // for FROM_USER) is intentionally not wired yet — this file is safe to ship
    // without moving real funds. Implementing the actual ethers.Contract calls is
    // the next step, once PLATFORM_WALLET_KEY is configured and a live test on a
    // small amount is explicitly approved.
    console.warn(`[wallet-treasury] on-chain submission not yet implemented — transfer ${transfer.id} left PENDING`)
    break
  }

  return { processed: pending.length, confirmed, failed }
}
