import { prisma } from '../shared/prisma'
import { Currency, CommissionStatus, Prisma } from '@prisma/client'
import { collectAncestorUserIds, getMatrixDepth } from './matrix-placement.service'
import { getPlanLevelPct, getDirectReferrerPct } from './commission-config.service'

// A plan purchase (e.g. upgrading to the credenciador tier) does NOT place the
// buyer in the matrix — they're already an affiliate somewhere in the network,
// this is just a subscription tier upgrade on their existing account. What it
// does do: part of the price they paid flows up their existing upline, exactly
// like a percentage of an order's margin does — same per-level %s
// (MATRIX_LEVEL_N_PCT), same ledger/balance mechanics. There's no consumer
// cashback or credenciador cut here (the buyer isn't "consuming" anything and
// no establishment/distributor is involved) — whatever isn't paid to the
// network (missing ancestors, or levels beyond the configured depth) simply
// stays as company revenue.
export async function distributeSubscriptionCommission(subscriptionPaymentId: string): Promise<void> {
  const payment = await prisma.subscriptionPayment.findUniqueOrThrow({
    where: { id: subscriptionPaymentId },
    select: {
      id: true,
      amount: true,
      userId: true,
      subscription: { select: { planRef: { select: { networkLevelPcts: true, directReferrerPct: true } } } },
    },
  })

  const amount = Number(payment.amount)
  if (amount <= 0) return

  const plan = payment.subscription.planRef

  const isActive = (status: string) => status === 'ACTIVE'
  const resolveStatus = (status: string): CommissionStatus =>
    isActive(status) ? CommissionStatus.RELEASED : CommissionStatus.BLOCKED

  const depth = getMatrixDepth()
  const ancestorIds = await collectAncestorUserIds(payment.userId, depth)

  const ledgerEntries: Prisma.CommissionLedgerCreateManyInput[] = []
  const balanceUpdates: { userId: string; amount: number; active: boolean }[] = []
  let networkTotal = 0

  for (let i = 0; i < ancestorIds.length; i++) {
    const levelAmount = amount * getPlanLevelPct(plan, i + 1)
    if (levelAmount <= 0) continue
    const ancUser = await prisma.user.findUnique({
      where: { id: ancestorIds[i] },
      select: { id: true, affiliateStatus: true },
    })
    if (!ancUser) continue
    ledgerEntries.push({
      recipientId: ancUser.id,
      subscriptionPaymentId: payment.id,
      amount: levelAmount,
      currency: Currency.FGOL,
      status: resolveStatus(ancUser.affiliateStatus),
      role: `network_l${i + 1}`,
      matrixLevel: i + 1,
    })
    balanceUpdates.push({ userId: ancUser.id, amount: levelAmount, active: isActive(ancUser.affiliateStatus) })
    networkTotal += levelAmount
  }

  // Direct-referral bonus — paid to User.referredById (who really invited the
  // buyer), on top of the matrix-level commissions above, not instead of them.
  // Independent of matrix position: the buyer's own network_l1 recipient can
  // be a different person if spillover placed them under someone else.
  const directReferrerPct = getDirectReferrerPct(plan)
  if (directReferrerPct > 0) {
    const buyer = await prisma.user.findUnique({ where: { id: payment.userId }, select: { referredById: true } })
    if (buyer?.referredById) {
      const referrer = await prisma.user.findUnique({
        where: { id: buyer.referredById },
        select: { id: true, affiliateStatus: true },
      })
      if (referrer) {
        const bonusAmount = amount * directReferrerPct
        if (bonusAmount > 0) {
          ledgerEntries.push({
            recipientId: referrer.id,
            subscriptionPaymentId: payment.id,
            amount: bonusAmount,
            currency: Currency.FGOL,
            status: resolveStatus(referrer.affiliateStatus),
            role: 'direct_referral',
          })
          balanceUpdates.push({ userId: referrer.id, amount: bonusAmount, active: isActive(referrer.affiliateStatus) })
          networkTotal += bonusAmount
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    if (ledgerEntries.length > 0) {
      await tx.commissionLedger.createMany({ data: ledgerEntries })
    }

    await tx.companyRevenue.create({
      data: {
        amount: amount - networkTotal,
        currency: Currency.FGOL,
        source: 'subscription_platform_cut',
        referenceId: payment.id,
      },
    })

    for (const { userId, amount: amt, active } of balanceUpdates) {
      await tx.user.update({
        where: { id: userId },
        data: active
          ? { fgolBalance: { increment: amt }, pendingOnChainAmount: { increment: amt } }
          : { fgolFrozen: { increment: amt } },
      })
    }
  })

  console.log(`[commissions] Distributed ${amount} FGOL subscription payment (subscriptionPaymentId=${subscriptionPaymentId}), ${ledgerEntries.length} network entries`)
}
