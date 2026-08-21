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

  if (customer) {
    entries.push({
      recipientId: customer.id,
      posPaymentId: pos.id,
      amount: margin * consumerPct,
      currency: 'FGOL',
      status: isActive(customer.affiliateStatus) ? 'RELEASED' : 'BLOCKED',
      role: 'consumer_cashback',
    })

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
        entries.push({ recipientId: u.id, posPaymentId: pos.id, amount: perLevel, currency: 'FGOL', status: isActive(u.affiliateStatus) ? 'RELEASED' : 'BLOCKED', role: `network_l${i + 1}`, matrixLevel: i + 1 })
      }
    }
  }

  // Credenciador
  if (credenciador) {
    entries.push({ recipientId: credenciador.id, posPaymentId: pos.id, amount: margin * credenciadorPct, currency: 'FGOL', status: isActive(credenciador.affiliateStatus) ? 'RELEASED' : 'BLOCKED', role: 'credenciador' })
  }

  if (entries.length > 0) {
    await prisma.commissionLedger.createMany({ data: entries })
  }

  // Platform cut
  await prisma.companyRevenue.create({ data: { amount: margin * platformPct, currency: 'BRL', source: 'platform_cut', referenceId: pos.id } })

  // Update consumer FGOL balance (guest payments have nothing to credit)
  if (customer) {
    const consumerAmount = margin * consumerPct
    if (isActive(customer.affiliateStatus)) {
      await prisma.user.update({ where: { id: customer.id }, data: { fgolBalance: { increment: consumerAmount }, lastPurchaseAt: new Date(), monthsWithoutPurchase: 0 } })
    } else {
      await prisma.user.update({ where: { id: customer.id }, data: { fgolFrozen: { increment: consumerAmount }, lastPurchaseAt: new Date(), affiliateStatus: 'ACTIVE', monthsWithoutPurchase: 0 } })
    }
  }
}

function getAncestors(pos: any) {
  const out: any[] = []
  let cur = pos.parent
  while (cur && out.length < 5) { out.push(cur); cur = cur.parent }
  return out
}
