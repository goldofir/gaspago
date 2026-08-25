import { prisma } from '../shared/prisma'
import { createPixCharge, getPixQrCode, asaasErrorMessage } from '../payments/asaas.client'
import { getOrCreateCustomerId } from '../payments/customer.service'

export type CreateOrderInput = {
  customerId: string
  distributorId: string
  items: { productId: string; quantity: number }[]
  deliveryAddress: string
  deliveryPostalCode: string
  paymentMethod: 'PIX' | 'CARD' | 'FGOL_BALANCE' | 'MIXED'
  fgolToUse?: number
  channel?: string
  cpf?: string
}

export class OrderCreationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message)
  }
}

// Shared by POST /orders (web/mobile, authenticated) and the WhatsApp bot —
// same payment/PIX logic either way, extracted so the two channels can't
// silently drift apart on how a charge actually gets created and settled.
export async function createOrder(input: CreateOrderInput) {
  const fgolToUse = input.fgolToUse ?? 0
  const channel = input.channel ?? 'app'

  const distributor = await prisma.distributor.findUniqueOrThrow({ where: { id: input.distributorId } })
  const products = await prisma.product.findMany({ where: { id: { in: input.items.map(i => i.productId) } } })

  let subtotal = 0
  for (const item of input.items) {
    const product = products.find(p => p.id === item.productId)
    if (!product) throw new OrderCreationError('Produto não encontrado.', 404)
    subtotal += Number(product.price) * item.quantity
  }

  const marginOffered = subtotal * distributor.cashbackPercent

  if (fgolToUse > 0) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: input.customerId } })
    if (Number(user.fgolBalance) < fgolToUse) {
      throw new OrderCreationError('Saldo FGOL insuficiente.')
    }
  }

  const pixAmount = Math.max(0, subtotal - fgolToUse)

  const order = await prisma.order.create({
    data: {
      customerId: input.customerId,
      distributorId: input.distributorId,
      deliveryAddress: input.deliveryAddress,
      deliveryPostalCode: input.deliveryPostalCode,
      subtotal,
      total: subtotal,
      marginOffered,
      cashbackPercent: distributor.cashbackPercent,
      paymentMethod: input.paymentMethod,
      paymentStatus: pixAmount === 0 ? 'PAID' : 'PENDING',
      fgolUsed: fgolToUse,
      fgolUsedBrlValue: fgolToUse,
      channel,
      items: {
        create: input.items.map(item => {
          const p = products.find(x => x.id === item.productId)!
          return { productId: item.productId, quantity: item.quantity, unitPrice: p.price, total: Number(p.price) * item.quantity }
        }),
      },
    },
  })

  if (pixAmount === 0) {
    // Fully covered by FGOL — nothing to actually collect.
    if (fgolToUse > 0) {
      await prisma.user.update({ where: { id: input.customerId }, data: { fgolBalance: { decrement: fgolToUse } } })
    }
    // Commissions are created after delivery confirmation (POST /:id/delivered), unchanged.
    return { order, pixQrCode: undefined, pixPayload: undefined }
  }

  // Real money is owed — create an actual Asaas PIX charge. paymentStatus stays
  // PENDING until asaas.webhook.ts confirms it. FGOL is only debited once the
  // charge exists, so a failed charge never leaves the balance drained for nothing.
  try {
    const asaasCustomerId = await getOrCreateCustomerId(input.customerId, input.cpf)
    const charge = await createPixCharge({
      customer: asaasCustomerId,
      value: pixAmount,
      description: `Gás Pago — ${distributor.name}`,
      externalReference: order.id,
    })
    const pixQr = charge.pixQrCode ?? (await getPixQrCode(charge.id).catch(() => undefined))

    const updatedOrder = await prisma.order.update({ where: { id: order.id }, data: { asaasChargeId: charge.id, invoiceUrl: charge.invoiceUrl } })
    if (fgolToUse > 0) {
      await prisma.user.update({ where: { id: input.customerId }, data: { fgolBalance: { decrement: fgolToUse } } })
    }

    return {
      order: updatedOrder,
      pixQrCode: (pixQr as any)?.encodedImage as string | undefined,
      pixPayload: (pixQr as any)?.payload as string | undefined,
    }
  } catch (err: any) {
    // No charge and nothing debited yet — safe to delete the order outright
    // rather than leave an unpayable PENDING order behind.
    await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
    await prisma.order.delete({ where: { id: order.id } })
    throw new OrderCreationError(asaasErrorMessage(err) ?? 'Não foi possível gerar a cobrança PIX. Tente novamente.')
  }
}
