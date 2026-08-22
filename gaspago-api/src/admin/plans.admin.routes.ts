import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../shared/prisma';

const PlanSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  price: z.number().min(0),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function plansAdminRoutes(app: FastifyInstance) {
  // GET /admin/plans
  app.get('/plans', async (_request, reply) => {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    // Prisma Decimal serializes to a string over JSON — coerce to a real number.
    return reply.send(plans.map(p => ({ ...p, price: Number(p.price) })));
  });

  // POST /admin/plans
  app.post('/plans', async (request, reply) => {
    const body = PlanSchema.parse(request.body);
    const existing = await prisma.plan.findUnique({ where: { slug: body.slug } });
    if (existing) return reply.status(409).send({ error: 'Já existe um plano com esse slug.' });

    const plan = await prisma.plan.create({ data: body });
    return reply.status(201).send(plan);
  });

  // PATCH /admin/plans/:id
  app.patch('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = PlanSchema.partial().parse(request.body);

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado.' });

    if (body.slug && body.slug !== plan.slug) {
      const clash = await prisma.plan.findUnique({ where: { slug: body.slug } });
      if (clash) return reply.status(409).send({ error: 'Já existe um plano com esse slug.' });
    }

    const updated = await prisma.plan.update({ where: { id }, data: body });
    return reply.send(updated);
  });

  // DELETE /admin/plans/:id — soft delete (isActive: false), never removes history
  // of subscriptions that reference it.
  app.delete('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return reply.status(404).send({ error: 'Plano não encontrado.' });

    await prisma.plan.update({ where: { id }, data: { isActive: false } });
    return reply.status(204).send();
  });
}
