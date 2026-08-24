import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { findDistributorsByPostalCode, findDistributorsByLocation } from './routing.service'
import { distributeCommissions } from '../commissions/commission.service'
import { NotificationService } from '../notifications/notification.service'
import { requireAuth } from '../shared/auth.middleware'
import { createPixCharge, getPixQrCode, asaasErrorMessage } from '../payments/asaas.client'
import { getOrCreateCustomerId } from '../payments/customer.service'

const CreateOrderSchema = z.object({
  distributorId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })),
  deliveryAddress: z.string(),
  deliveryPostalCode: z.string(),
  paymentMethod: z.enum(['PIX', 'CARD', 'FGOL_BALANCE', 'MIXED']),
  fgolToUse: z.number().default(0),
  channel: z.string().default('app'),
  cpf: z.string().regex(/^\d{11}$/).optional(),
})

export async function orderRoutes(app: FastifyInstance) {
  // GET /orders/distributors?cep=01310100 OR ?lat=-23.5&lng=-46.6
  app.get('/distributors', async (req) => {
    const { cep, lat, lng } = req.query as { cep?: string; lat?: string; lng?: string }
    if (lat && lng) {
      return findDistributorsByLocation(parseFloat(lat), parseFloat(lng))
    }
    return findDistributorsByPostalCode(cep ?? '')
  })

  // GET /orders?limit= — authenticated customer's own order history
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const customerId = (req as any).user.id as string
    const { limit } = req.query as { limit?: string }
    return prisma.order.findMany({
      where: { customerId },
      include: { distributor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit ? Number(limit) : 20,
    })
  })

  // POST /orders — create order (requires a logged-in consumer)
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = CreateOrderSchema.parse(req.body)
    const customerId = (req as any).user.id as string

    const distributor = await prisma.distributor.findUniqueOrThrow({ where: { id: body.distributorId } })
    const products = await prisma.product.findMany({ where: { id: { in: body.items.map(i => i.productId) } } })

    let subtotal = 0
    for (const item of body.items) {
      const product = products.find(p => p.id === item.productId)!
      subtotal += Number(product.price) * item.quantity
    }

    const marginOffered = subtotal * distributor.cashbackPercent

    if (body.fgolToUse > 0) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: customerId } })
      if (Number(user.fgolBalance) < body.fgolToUse) {
        return reply.status(400).send({ error: 'Saldo FGOL insuficiente.' })
      }
    }

    const pixAmount = Math.max(0, subtotal - body.fgolToUse)

    const order = await prisma.order.create({
      data: {
        customerId,
        distributorId: body.distributorId,
        deliveryAddress: body.deliveryAddress,
        deliveryPostalCode: body.deliveryPostalCode,
        subtotal,
        total: subtotal,
        marginOffered,
        cashbackPercent: distributor.cashbackPercent,
        paymentMethod: body.paymentMethod,
        paymentStatus: pixAmount === 0 ? 'PAID' : 'PENDING',
        fgolUsed: body.fgolToUse,
        fgolUsedBrlValue: body.fgolToUse,
        channel: body.channel,
        items: {
          create: body.items.map(item => {
            const p = products.find(x => x.id === item.productId)!
            return { productId: item.productId, quantity: item.quantity, unitPrice: p.price, total: Number(p.price) * item.quantity }
          }),
        },
      },
    })

    if (pixAmount === 0) {
      // Fully covered by FGOL — nothing to actually collect.
      if (body.fgolToUse > 0) {
        await prisma.user.update({ where: { id: customerId }, data: { fgolBalance: { decrement: body.fgolToUse } } })
      }
      // Commissions are created after delivery confirmation (POST /:id/delivered), unchanged.
      return reply.status(201).send(order)
    }

    // Real money is owed — create an actual Asaas PIX charge. paymentStatus stays
    // PENDING until asaas.webhook.ts confirms it. FGOL is only debited once the
    // charge exists, so a failed charge never leaves the balance drained for nothing.
    try {
      const asaasCustomerId = await getOrCreateCustomerId(customerId, body.cpf)
      const charge = await createPixCharge({
        customer: asaasCustomerId,
        value: pixAmount,
        description: `Gás Pago — ${distributor.name}`,
        externalReference: order.id,
      })
      const pixQr = charge.pixQrCode ?? (await getPixQrCode(charge.id).catch(() => undefined))

      const updatedOrder = await prisma.order.update({ where: { id: order.id }, data: { asaasChargeId: charge.id, invoiceUrl: charge.invoiceUrl } })
      if (body.fgolToUse > 0) {
        await prisma.user.update({ where: { id: customerId }, data: { fgolBalance: { decrement: body.fgolToUse } } })
      }

      return reply.status(201).send({
        ...updatedOrder,
        pixQrCode: (pixQr as any)?.encodedImage,
        pixPayload: (pixQr as any)?.payload,
      })
    } catch (err: any) {
      // No charge and nothing debited yet — safe to delete the order outright
      // rather than leave an unpayable PENDING order behind.
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
      await prisma.order.delete({ where: { id: order.id } })
      return reply.status(400).send({ error: asaasErrorMessage(err) ?? 'Não foi possível gerar a cobrança PIX. Tente novamente.' })
    }
  })

  // POST /orders/:id/delivered — mark delivered, trigger commissions
  app.post('/:id/delivered', async (req, reply) => {
    const { id } = req.params as { id: string }
    const order = await prisma.order.update({ where: { id }, data: { status: 'DELIVERED', deliveredAt: new Date() } })
    // fire-and-forget — don't block the response
    distributeCommissions(id).catch(err => app.log.error({ err }, 'Commission distribution failed'))
    NotificationService.sendToUser(order.customerId, 'Entrega confirmada!', 'Seu gás chegou. Aproveite!', { orderId: id }).catch(() => {})
    return reply.send({ ok: true })
  })

  // GET /orders/:id
  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.order.findUniqueOrThrow({ where: { id }, include: { items: true } })
  })
}
