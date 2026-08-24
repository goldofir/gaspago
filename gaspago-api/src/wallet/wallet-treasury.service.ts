import { ethers } from 'ethers'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'

const FGOL_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
]

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

// Reads live from SystemConfigService (the encrypted DB store SuperAdmin writes
// to), not the static config.polygon object — that object reads process.env
// directly, which is never populated from SuperAdmin the way every other
// credential in this app is. Using it here would make isTreasuryConfigured()
// always report "not configured" even after the key is set (same bug already
// found and fixed for CONEXBOT_WEBHOOK_SECRET).
function getTreasuryConfig() {
  return {
    rpcUrl: SystemConfigService.get('POLYGON_RPC_URL') || 'https://polygon-rpc.com',
    fgolContract: SystemConfigService.get('FGOL_CONTRACT'),
    platformWalletKey: SystemConfigService.get('PLATFORM_WALLET_KEY'),
  }
}

function isTreasuryConfigured(): boolean {
  const { fgolContract, platformWalletKey } = getTreasuryConfig()
  return !!(fgolContract && platformWalletKey)
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

    try {
      const txHash = await submitTransfer(transfer.direction, transfer.user.walletAddress, Number(transfer.amount))
      await prisma.onChainTransfer.update({
        where: { id: transfer.id },
        data: { status: 'CONFIRMED', txHash, confirmedAt: new Date() },
      })
      confirmed++
    } catch (err: any) {
      console.error(`[wallet-treasury] transfer ${transfer.id} failed:`, err?.message ?? err)
      await prisma.onChainTransfer.update({
        where: { id: transfer.id },
        data: { status: 'FAILED', error: String(err?.message ?? err).slice(0, 500) },
      })
      failed++
    }
  }

  return { processed: pending.length, confirmed, failed }
}

// Submits the real Polygon transaction and waits for it to be mined. TO_USER
// sends from the treasury directly; FROM_USER pulls from the user's wallet via
// the allowance they approved at wallet setup (walletApprovedAt) — the treasury
// never holds the user's private key, it can only move what was approved.
async function submitTransfer(direction: 'TO_USER' | 'FROM_USER', walletAddress: string, amount: number): Promise<string> {
  const { rpcUrl, fgolContract, platformWalletKey } = getTreasuryConfig()
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const treasuryWallet = new ethers.Wallet(platformWalletKey!, provider)
  const contract = new ethers.Contract(fgolContract!, FGOL_ABI, treasuryWallet)
  const amountWei = ethers.parseUnits(amount.toString(), 18)

  const tx = direction === 'TO_USER'
    ? await contract.transfer(walletAddress, amountWei)
    : await contract.transferFrom(walletAddress, treasuryWallet.address, amountWei)

  const receipt = await tx.wait()
  return receipt.hash
}
