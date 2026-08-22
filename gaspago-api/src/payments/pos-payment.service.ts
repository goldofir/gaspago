import { PosPayment } from '@prisma/client'
import { prisma } from '../shared/prisma'
import { distributeCommissionsPos } from '../commissions/pos-commission.service'
import { queueRedemptionPullback } from '../wallet/wallet-treasury.service'

// Shared by both the immediate-settlement path (FGOL fully covers the amount —
// no real money to collect, nothing to wait for) and the Asaas webhook path
// (PIX portion was charged for real — this runs only once payment.status
// actually confirms). Never call this twice for the same PosPayment: the
// caller is responsible for the AWAITING_SCAN/AWAITING_PAYMENT -> PAID
// transition happening exactly once.
export async function finalizePosPayment(posPaymentId: string): Promise<void> {
  const settled = await prisma.posPayment.findUniqueOrThrow({ where: { id: posPaymentId } })
  await distributeCommissionsPos(settled)

  const fgolUsed = Number(settled.fgolUsed)
  if (fgolUsed > 0 && settled.customerId) {
    await queueRedemptionPullback(settled.customerId, fgolUsed, 'pos_payment', settled.id)
  }
}

export async function markPosPaymentPaid(posPaymentId: string): Promise<PosPayment> {
  return prisma.posPayment.update({
    where: { id: posPaymentId },
    data: { status: 'PAID', settledAt: new Date() },
  })
}
