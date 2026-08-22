import { prisma } from '../shared/prisma'
import { Currency, CommissionStatus, Prisma } from '@prisma/client'
import { config } from '../config'

const {
  consumerPct,
  platformPct,
  networkPct,
  credenciadorPct,
} = config.commission

export async function distributeCommissions(orderId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      marginOffered: true,
      customerId: true,
      distributor: { select: { credenciadorId: true } },
    },
  })

  const margin = Number(order.marginOffered)
  if (margin <= 0) return

  const customer = await prisma.user.findUniqueOrThrow({
    where: { id: order.customerId },
    select: { id: true, affiliateStatus: true },
  })

  const isActive = (status: string) => status === 'ACTIVE'
  const resolveStatus = (status: string): CommissionStatus =>
    isActive(status) ? CommissionStatus.RELEASED : CommissionStatus.BLOCKED

  const ledgerEntries: Prisma.CommissionLedgerCreateManyInput[] = []
  const balanceUpdates: { userId: string; amount: number; active: boolean }[] = []

  // Consumer cashback
  const consumerAmount = margin * consumerPct
  ledgerEntries.push({
    recipientId: customer.id,
    orderId: order.id,
    amount: consumerAmount,
    currency: Currency.FGOL,
    status: resolveStatus(customer.affiliateStatus),
    role: 'consumer_cashback',
  })
  balanceUpdates.push({ userId: customer.id, amount: consumerAmount, active: isActive(customer.affiliateStatus) })

  // Network: walk up to 5 matrix levels
  const perLevel = (margin * networkPct) / 5
  const matrixPos = await prisma.matrixPosition.findUnique({
    where: { userId: customer.id },
    include: {
      parent: {
        include: {
          parent: {
            include: {
              parent: {
                include: {
                  parent: {
                    include: { parent: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (matrixPos) {
    const ancestors = collectAncestors(matrixPos)
    for (let i = 0; i < ancestors.length; i++) {
      const anc = ancestors[i]
      const ancUser = await prisma.user.findUnique({
        where: { id: anc.userId },
        select: { id: true, affiliateStatus: true },
      })
      if (!ancUser) continue
      ledgerEntries.push({
        recipientId: ancUser.id,
        orderId: order.id,
        amount: perLevel,
        currency: Currency.FGOL,
        status: resolveStatus(ancUser.affiliateStatus),
        role: `network_l${i + 1}`,
        matrixLevel: i + 1,
      })
      balanceUpdates.push({ userId: ancUser.id, amount: perLevel, active: isActive(ancUser.affiliateStatus) })
    }
  }

  // Credenciador
  if (order.distributor?.credenciadorId) {
    const credenciador = await prisma.user.findUnique({
      where: { id: order.distributor.credenciadorId },
      select: { id: true, affiliateStatus: true },
    })
    if (credenciador) {
      const credAmount = margin * credenciadorPct
      ledgerEntries.push({
        recipientId: credenciador.id,
        orderId: order.id,
        amount: credAmount,
        currency: Currency.FGOL,
        status: resolveStatus(credenciador.affiliateStatus),
        role: 'credenciador',
      })
      balanceUpdates.push({ userId: credenciador.id, amount: credAmount, active: isActive(credenciador.affiliateStatus) })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (ledgerEntries.length > 0) {
      await tx.commissionLedger.createMany({ data: ledgerEntries })
    }

    // Platform cut → CompanyRevenue
    await tx.companyRevenue.create({
      data: {
        amount: margin * platformPct,
        currency: Currency.FGOL,
        source: 'platform_cut',
        referenceId: order.id,
      },
    })

    for (const { userId, amount, active } of balanceUpdates) {
      await tx.user.update({
        where: { id: userId },
        data: active
          ? { fgolBalance: { increment: amount }, pendingOnChainAmount: { increment: amount } }
          : { fgolFrozen: { increment: amount } },
      })
    }

    // Placing an order is a consumption event — resets the 30/60-day redemption window.
    await tx.user.update({
      where: { id: customer.id },
      data: { lastConsumptionAt: new Date() },
    })
  })

  console.log(`[commissions] Distributed ${margin} FGOL margin for orderId=${orderId} (${ledgerEntries.length} ledger entries)`)
}

function collectAncestors(pos: any): any[] {
  const out: any[] = []
  let cur = pos.parent
  while (cur && out.length < 5) {
    out.push(cur)
    cur = cur.parent
  }
  return out
}
