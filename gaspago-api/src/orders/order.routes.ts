import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { findDistributorsByPostalCode, findDistributorsByLocation } from './routing.service'
import { distributeCommissions } from '../commissions/commission.service'
import { NotificationService } from '../notifications/notification.service'
import { requireAuth } from '../shared/auth.middleware'

const CreateOrderSchema = z.object({
  distributorId: z.string(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })),
  deliveryAddress: z.string(),
  deliveryPostalCode: z.string(),
  paymentMethod: z.enum(['PIX', 'CARD', 'FGOL_BALANCE', 'MIXED']),
  fgolToUse: z.number().default(0),
  channel: z.string().default('app'),
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
        fgolUsed: body.fgolToUse,
        channel: body.channel,
        items: {
          create: body.items.map(item => {
            const p = products.find(x => x.id === item.productId)!
            return { productId: item.productId, quantity: item.quantity, unitPrice: p.price, total: Number(p.price) * item.quantity }
          }),
        },
      },
    })

    // Commissions are created after delivery confirmation
    return reply.status(201).send(order)
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
