import { prisma } from '../shared/prisma'

export async function runDailyExpiryCheck(): Promise<void> {
  const now = new Date()
  console.log(`[expiry-cron] Running daily expiry check at ${now.toISOString()}`)

  const expiredLedgers = await prisma.commissionLedger.findMany({
    where: {
      status: 'BLOCKED',
      expiresAt: { lt: now },
    },
    select: { id: true, recipientId: true, amount: true, currency: true },
  })

  if (expiredLedgers.length === 0) {
    console.log('[expiry-cron] No expired commissions found.')
    return
  }

  for (const ledger of expiredLedgers) {
    await prisma.$transaction([
      prisma.commissionLedger.update({
        where: { id: ledger.id },
        data: { status: 'EXPIRED', expiredAt: now },
      }),
      prisma.companyRevenue.create({
        data: {
          amount: ledger.amount,
          currency: ledger.currency,
          source: 'forfeited_commission',
          referenceId: ledger.id,
        },
      }),
      prisma.user.update({
        where: { id: ledger.recipientId },
        data: {
          fgolFrozen: { decrement: Number(ledger.amount) },
          affiliateStatus: 'EXPIRED',
        },
      }),
    ])
  }

  console.log(`[expiry-cron] Expired ${expiredLedgers.length} commission(s) and transferred to company revenue.`)
}
