import { prisma } from '../shared/prisma'
import { config } from '../config'

// Run this on the last day of each month via cron / Railway scheduler.
// For Docker: use a separate cron container or a node-cron job.
export async function runMonthlyCommissionCron() {
  const now = new Date()
  console.log(`[cron] Running monthly commission check at ${now.toISOString()}`)

  const affiliates = await prisma.user.findMany({
    where: { actorType: { not: 'ADMIN' } },
    select: { id: true, affiliateStatus: true, monthsWithoutPurchase: true, lastPurchaseAt: true, fgolFrozen: true },
  })

  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  for (const affiliate of affiliates) {
    const consumedThisMonth = affiliate.lastPurchaseAt && affiliate.lastPurchaseAt >= currentMonth

    if (consumedThisMonth) {
      // Active: release any frozen commissions
      if (affiliate.affiliateStatus === 'BLOCKED' && Number(affiliate.fgolFrozen) > 0) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: affiliate.id },
            data: { affiliateStatus: 'ACTIVE', monthsWithoutPurchase: 0, fgolBalance: { increment: affiliate.fgolFrozen }, pendingOnChainAmount: { increment: affiliate.fgolFrozen }, fgolFrozen: 0 },
          }),
          prisma.commissionLedger.updateMany({
            where: { recipientId: affiliate.id, status: 'BLOCKED' },
            data: { status: 'RELEASED' },
          }),
        ])
      } else {
        await prisma.user.update({ where: { id: affiliate.id }, data: { affiliateStatus: 'ACTIVE', monthsWithoutPurchase: 0 } })
      }
      continue
    }

    // Did not consume this month
    const newCount = affiliate.monthsWithoutPurchase + 1

    if (newCount >= config.commission.expireAfterMonths) {
      // Expire — move frozen commissions to company revenue
      const frozen = Number(affiliate.fgolFrozen)
      if (frozen > 0) {
        await prisma.$transaction([
          prisma.companyRevenue.create({ data: { amount: frozen, currency: 'FGOL', source: 'forfeited_commission', referenceId: affiliate.id } }),
          prisma.commissionLedger.updateMany({
            where: { recipientId: affiliate.id, status: 'BLOCKED' },
            data: { status: 'EXPIRED', expiredAt: now },
          }),
          prisma.user.update({ where: { id: affiliate.id }, data: { affiliateStatus: 'EXPIRED', monthsWithoutPurchase: newCount, fgolFrozen: 0 } }),
        ])
        console.log(`[cron] Expired ${frozen} FGOL from affiliate ${affiliate.id}`)
      }
    } else if (newCount >= config.commission.blockAfterMonths) {
      // Block commissions
      await prisma.$transaction([
        prisma.user.update({ where: { id: affiliate.id }, data: { affiliateStatus: 'BLOCKED', monthsWithoutPurchase: newCount } }),
        prisma.commissionLedger.updateMany({
          where: { recipientId: affiliate.id, status: 'RELEASED' },
          data: { status: 'BLOCKED', blockedAt: now, expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
        }),
        // Move released balance to frozen
        prisma.user.update({ where: { id: affiliate.id }, data: { fgolFrozen: { increment: affiliate.fgolFrozen }, fgolBalance: 0 } }),
      ])
      console.log(`[cron] Blocked affiliate ${affiliate.id} — ${newCount} month(s) without purchase`)
    }
  }

  console.log(`[cron] Monthly commission check complete. Processed ${affiliates.length} affiliates.`)
}
