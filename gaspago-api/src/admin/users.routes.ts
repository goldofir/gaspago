import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

export async function usersRoutes(app: FastifyInstance) {
  // GET /admin/users/stats
  app.get(
    '/users/stats',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              active: { type: 'integer' },
              blocked: { type: 'integer' },
              expired: { type: 'integer' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      const [total, active, blocked, expired] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { affiliateStatus: 'ACTIVE' } }),
        prisma.user.count({ where: { affiliateStatus: 'BLOCKED' } }),
        prisma.user.count({ where: { affiliateStatus: 'EXPIRED' } }),
      ])

      return reply.send({ total, active, blocked, expired })
    }
  )

  // GET /admin/users
  app.get(
    '/users',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ACTIVE', 'BLOCKED', 'EXPIRED'] },
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              users: { type: 'array', items: { type: 'object' } },
              total: { type: 'integer' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { status, limit = 50, offset = 0 } = req.query as {
        status?: 'ACTIVE' | 'BLOCKED' | 'EXPIRED'
        limit?: number
        offset?: number
      }

      const where = status ? { affiliateStatus: status } : {}

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            affiliateStatus: true,
            fgolBalance: true,
            fgolFrozen: true,
            lastPurchaseAt: true,
            createdAt: true,
            _count: {
              select: {
                orders: true,
                commissionsReceived: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset),
        }),
        prisma.user.count({ where }),
      ])

      return reply.send({ users, total })
    }
  )
}
