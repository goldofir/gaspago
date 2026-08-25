import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { findDistributorsByPostalCode, findDistributorsByLocation } from './routing.service'
import { distributeCommissions } from '../commissions/commission.service'
import { NotificationService } from '../notifications/notification.service'
import { requireAuth, requireRole } from '../shared/auth.middleware'
import { createOrder, OrderCreationError } from './order.service'

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

    try {
      const { order, pixQrCode, pixPayload } = await createOrder({ ...body, customerId })
      return reply.status(201).send(pixQrCode || pixPayload ? { ...order, pixQrCode, pixPayload } : order)
    } catch (err: any) {
      if (err instanceof OrderCreationError) {
        return reply.status(err.statusCode).send({ error: err.message })
      }
      throw err
    }
  })

  // POST /orders/:id/delivered — mark delivered, trigger commissions.
  // No client actually calls this (the distributor portal uses PATCH
  // /distributors/me/orders/:orderId/status, which is scoped to the caller's
  // own distributorId) — but it triggers a real commission payout, so it had
  // no business being reachable with zero auth. Restricted to admin as a
  // manual-override utility rather than left open to anyone who finds it.
  app.post('/:id/delivered', { preHandler: requireRole('SUPERADMIN', 'ADMIN') }, async (req, reply) => {
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
