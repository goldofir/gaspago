import { FastifyInstance } from 'fastify';
import { prisma } from '../shared/prisma';

export async function establishmentsAdminRoutes(app: FastifyInstance) {
  // GET /admin/establishments
  app.get(
    '/establishments',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { search, category, limit = 50, offset = 0 } = request.query as {
        search?: string;
        category?: string;
        limit?: number;
        offset?: number;
      };

      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as const } },
          { cnpj: { contains: search.replace(/\D/g, ''), mode: 'insensitive' as const } },
        ];
      }

      if (category) {
        where.category = category;
      }

      const establishments = await prisma.establishment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit), 200),
        skip: Number(offset),
        include: {
          _count: {
            select: {
              marketplaceItems: true,
              posPayments: true,
            },
          },
        },
      });

      return reply.send(establishments);
    }
  );

  // GET /admin/establishments/stats
  app.get('/establishments/stats', async (_request, reply) => {
    const [total, active, byCategory] = await Promise.all([
      prisma.establishment.count(),
      prisma.establishment.count({ where: { isActive: true } }),
      prisma.establishment.groupBy({
        by: ['category'],
        _count: true,
      }),
    ]);

    return reply.send({
      total,
      active,
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count })),
    });
  });
}
