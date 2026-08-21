import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'

const updateStatusBody = z.object({
  status: z.nativeEnum(OrderStatus),
})

export async function ordersAdminRoutes(app: FastifyInstance) {
  /**
   * GET /admin/orders/stats
   * Returns counts per status bucket.
   */
  app.get(
    '/orders/stats',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              pending: { type: 'integer' },
              inDelivery: { type: 'integer' },
              delivered: { type: 'integer' },
              cancelled: { type: 'integer' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      const [total, pending, inDelivery, delivered, cancelled] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'IN_DELIVERY' } }),
        prisma.order.count({ where: { status: 'DELIVERED' } }),
        prisma.order.count({ where: { status: 'CANCELLED' } }),
      ])

      return reply.send({ total, pending, inDelivery, delivered, cancelled })
    }
  )

  /**
   * GET /admin/orders
   * Query params: status?, limit=100, offset=0
   * Returns orders with customer, distributor, and item count.
   */
  app.get(
    '/orders',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            limit: { type: 'integer', default: 100 },
            offset: { type: 'integer', default: 0 },
          },
        },
      },
    },
    async (req, reply) => {
      const { status, limit = 100, offset = 0 } = req.query as {
        status?: string
        limit?: number
        offset?: number
      }

      const where: Record<string, unknown> = {}
      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        where.status = status as OrderStatus
      }

      const orders = await prisma.order.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          distributor: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
      })

      return reply.send(orders)
    }
  )

  /**
   * POST /admin/orders/:id/status
   * Body: { status: OrderStatus }
   * Updates the order's status field.
   */
  app.post(
    '/orders/:id/status',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
          422: {
            type: 'object',
            properties: { error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string }

      const parsed = updateStatusBody.safeParse(req.body)
      if (!parsed.success) {
        return reply.status(422).send({ error: parsed.error.issues[0]?.message ?? 'Status inválido' })
      }

      const exists = await prisma.order.findUnique({ where: { id }, select: { id: true } })
      if (!exists) {
        return reply.status(404).send({ error: 'Pedido não encontrado' })
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: parsed.data.status },
        select: { id: true, status: true, updatedAt: true },
      })

      return reply.send({
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      })
    }
  )
}
