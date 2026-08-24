import { PosPayment } from '@prisma/client'
import { prisma } from '../shared/prisma'
import { config } from '../config'
import { collectAncestorUserIds, getMatrixDepth } from './matrix-placement.service'

const { consumerPct, platformPct, networkPct, credenciadorPct, establishmentBonusPct } = config.commission

export async function distributeCommissionsPos(pos: PosPayment) {
  const margin = Number(pos.marginOffered)
  const customerId = pos.customerId
  // A guest (no account) payment still owes credenciador commission and the
  // platform cut — it just has no consumer cashback or network to pay out.
  const customer = customerId ? await prisma.user.findUnique({ where: { id: customerId } }) : null
  const est = await prisma.establishment.findUniqueOrThrow({ where: { id: pos.establishmentId } })
  const credenciador = await prisma.user.findUnique({ where: { id: est.credenciadorId } })

  const isActive = (status: string) => status === 'ACTIVE'

  const entries: any[] = []
  // Every recipient here is credited the exact same way — network/credenciador
  // commissions are not a special case, they're "his" commissions just like the
  // consumer's own cashback: same RELEASED/BLOCKED branching, same balance credit,
  // same pendingOnChainAmount queueing.
  const balanceUpdates: { userId: string; amount: number; active: boolean }[] = []

  if (customer) {
    const consumerAmount = margin * consumerPct
    const consumerActive = isActive(customer.affiliateStatus)
    entries.push({
      recipientId: customer.id,
      posPaymentId: pos.id,
      amount: consumerAmount,
      currency: 'FGOL',
      status: consumerActive ? 'RELEASED' : 'BLOCKED',
      role: 'consumer_cashback',
    })
    balanceUpdates.push({ userId: customer.id, amount: consumerAmount, active: consumerActive })

    // Walk matrix for network commissions — same depth-based split as orders
    // (distributeCommissions in commission.service.ts): a fixed share per
    // configured level, not divided by however many ancestors happen to
    // exist. Fewer ancestors than MATRIX_DEPTH just means those levels'
    // share goes unpaid, same as the order flow.
    const depth = getMatrixDepth()
    const perLevel = (margin * networkPct) / depth
    const ancestorIds = await collectAncestorUserIds(customer.id, depth)
    for (let i = 0; i < ancestorIds.length; i++) {
      const u = await prisma.user.findUnique({ where: { id: ancestorIds[i] } })
      if (!u) continue
      const active = isActive(u.affiliateStatus)
      entries.push({ recipientId: u.id, posPaymentId: pos.id, amount: perLevel, currency: 'FGOL', status: active ? 'RELEASED' : 'BLOCKED', role: `network_l${i + 1}`, matrixLevel: i + 1 })
      balanceUpdates.push({ userId: u.id, amount: perLevel, active })
    }
  }

  // Credenciador
  if (credenciador) {
    const credAmount = margin * credenciadorPct
    const credActive = isActive(credenciador.affiliateStatus)
    entries.push({ recipientId: credenciador.id, posPaymentId: pos.id, amount: credAmount, currency: 'FGOL', status: credActive ? 'RELEASED' : 'BLOCKED', role: 'credenciador' })
    balanceUpdates.push({ userId: credenciador.id, amount: credAmount, active: credActive })
  }

  if (entries.length > 0) {
    await prisma.commissionLedger.createMany({ data: entries })
  }

  // Platform cut
  await prisma.companyRevenue.create({ data: { amount: margin * platformPct, currency: 'BRL', source: 'platform_cut', referenceId: pos.id } })

  // Credit every recipient's balance — consumer, network ancestors, credenciador alike.
  for (const { userId, amount, active } of balanceUpdates) {
    if (active) {
      await prisma.user.update({ where: { id: userId }, data: { fgolBalance: { increment: amount }, pendingOnChainAmount: { increment: amount } } })
    } else {
      await prisma.user.update({ where: { id: userId }, data: { fgolFrozen: { increment: amount } } })
    }
  }

  // Only the actual buyer's own consumption resets their inactivity clock and
  // reactivates them going forward — receiving a commission from someone else's
  // purchase is not "consuming."
  if (customer) {
    await prisma.user.update({
      where: { id: customer.id },
      data: { lastPurchaseAt: new Date(), lastConsumptionAt: new Date(), affiliateStatus: 'ACTIVE', monthsWithoutPurchase: 0 },
    })
  }
}
