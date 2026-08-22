import { PosPayment } from '@prisma/client'
import { prisma } from '../shared/prisma'
import { config } from '../config'

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

    // Walk matrix for network commissions
    const matrixPos = await prisma.matrixPosition.findUnique({
      where: { userId: customer.id },
      include: { parent: { include: { parent: { include: { parent: { include: { parent: { include: { parent: true } } } } } } } } },
    })
    if (matrixPos) {
      const levels = getAncestors(matrixPos)
      const perLevel = (margin * networkPct) / levels.length
      for (let i = 0; i < levels.length; i++) {
        const anc = levels[i]
        const u = await prisma.user.findUnique({ where: { id: anc.userId } })
        if (!u) continue
        const active = isActive(u.affiliateStatus)
        entries.push({ recipientId: u.id, posPaymentId: pos.id, amount: perLevel, currency: 'FGOL', status: active ? 'RELEASED' : 'BLOCKED', role: `network_l${i + 1}`, matrixLevel: i + 1 })
        balanceUpdates.push({ userId: u.id, amount: perLevel, active })
      }
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

function getAncestors(pos: any) {
  const out: any[] = []
  let cur = pos.parent
  while (cur && out.length < 5) { out.push(cur); cur = cur.parent }
  return out
}
