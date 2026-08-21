import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma';

const createSchema = z.object({
  name: z.string().min(1),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 14, { message: 'CNPJ deve ter 14 dígitos' }),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  cep: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  cashbackPercent: z.number().min(0).max(20).optional().default(0),
});

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 14, { message: 'CNPJ deve ter 14 dígitos' })
    .optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  cep: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().length(2).optional(),
  cashbackPercent: z.number().min(0).max(20).optional(),
  isActive: z.boolean().optional(),
});

export async function distributorsAdminRoutes(app: FastifyInstance) {
  // GET /admin/distributors
  app.get(
    '/distributors',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
          },
        },
      },
    },
    async (request, reply) => {
      const { search, limit = 50, offset = 0 } = request.query as {
        search?: string;
        limit?: number;
        offset?: number;
      };

      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { cnpj: { contains: search.replace(/\D/g, ''), mode: 'insensitive' as const } },
            ],
          }
        : {};

      const distributors = await prisma.distributor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(Number(limit), 200),
        skip: Number(offset),
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      });

      return reply.send(distributors);
    }
  );

  // POST /admin/distributors
  app.post(
    '/distributors',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'cnpj', 'phone', 'cep', 'address', 'city', 'state'],
          properties: {
            name: { type: 'string' },
            cnpj: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            cep: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            cashbackPercent: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          message: 'Dados inválidos',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;

      const existing = await prisma.distributor.findFirst({
        where: { cnpj: data.cnpj },
      });
      if (existing) {
        return reply.status(409).send({ message: 'CNPJ já cadastrado' });
      }

      const distributor = await prisma.distributor.create({
        data: {
          name: data.name,
          cnpj: data.cnpj,
          phone: data.phone,
          email: data.email,
          postalCode: data.cep,
          address: data.address,
          city: data.city,
          state: data.state.toUpperCase(),
          cashbackPercent: data.cashbackPercent,
          credenciadorId: (request as any).user?.id ?? 'system',
          isActive: true,
          rating: 0,
        },
      });

      return reply.status(201).send(distributor);
    }
  );

  // PATCH /admin/distributors/:id
  app.patch(
    '/distributors/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            cnpj: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            cep: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            cashbackPercent: { type: 'number' },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.distributor.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ message: 'Distribuidora não encontrada' });
      }

      const parsed = patchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          message: 'Dados inválidos',
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = parsed.data;

      if (data.cnpj && data.cnpj !== existing.cnpj) {
        const conflict = await prisma.distributor.findFirst({
          where: { cnpj: data.cnpj, id: { not: id } },
        });
        if (conflict) {
          return reply.status(409).send({ message: 'CNPJ já cadastrado em outra distribuidora' });
        }
      }

      const updatePayload: Record<string, unknown> = { ...data };
      if (data.state) updatePayload.state = data.state.toUpperCase();

      const updated = await prisma.distributor.update({
        where: { id },
        data: updatePayload,
      });

      return reply.send(updated);
    }
  );

  // DELETE /admin/distributors/:id — soft delete
  app.delete(
    '/distributors/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await prisma.distributor.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ message: 'Distribuidora não encontrada' });
      }

      await prisma.distributor.update({
        where: { id },
        data: { isActive: false },
      });

      return reply.send({ ok: true });
    }
  );
}
