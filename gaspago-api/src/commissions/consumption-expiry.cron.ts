import { prisma } from '../shared/prisma'

// Redemption window based on the user's OWN last purchase (gas order or marketplace
// checkout) — independent of the affiliate-network activity state machine in
// expiry.cron.ts / commission.cron.ts, which tracks referral-driven commissions.
//
// 0–30 days since last consumption: fgolBalance fully usable (PIX withdrawal + marketplace).
// 30–60 days: PIX withdrawal blocked, marketplace purchases still accept FGOL.
// 60+ days: balance forfeited entirely, moved to CompanyRevenue.

const PIX_LOCK_DAYS = 30
const FULL_EXPIRY_DAYS = 60

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

// Used by the (forthcoming) PIX withdrawal endpoint to gate the request.
export function isPixWithdrawalAllowed(lastConsumptionAt: Date | null): boolean {
  if (!lastConsumptionAt) return true // never purchased yet — nothing earned to lock
  return lastConsumptionAt >= daysAgo(PIX_LOCK_DAYS)
}

export async function runConsumptionExpiryCheck(): Promise<void> {
  const now = new Date()
  console.log(`[consumption-expiry-cron] Running at ${now.toISOString()}`)

  const expired = await prisma.user.findMany({
    where: {
      lastConsumptionAt: { lt: daysAgo(FULL_EXPIRY_DAYS) },
      fgolBalance: { gt: 0 },
    },
    select: { id: true, fgolBalance: true, pendingOnChainAmount: true },
  })

  if (expired.length === 0) {
    console.log('[consumption-expiry-cron] No balances to expire.')
    return
  }

  for (const user of expired) {
    const forfeited = Number(user.fgolBalance)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { fgolBalance: 0, pendingOnChainAmount: 0 },
      }),
      prisma.companyRevenue.create({
        data: {
          amount: forfeited,
          currency: 'FGOL',
          source: 'forfeited_inactivity',
          referenceId: user.id,
        },
      }),
    ])
  }

  console.log(`[consumption-expiry-cron] Expired FGOL balance for ${expired.length} user(s) — 60+ days without consumption.`)
}
