import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { createSubAccount } from '../payments/asaas.client'
import { requireRole } from '../shared/auth.middleware'

const CreateDistributorSchema = z.object({
  name: z.string(),
  cnpj: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  cashbackPercent: z.number().min(0).max(1),
  serviceRadiusKm: z.number().default(5),
})

async function getMeDistributor(distributorId?: string) {
  if (!distributorId) {
    throw Object.assign(new Error('Conta não vinculada a uma distribuidora.'), { statusCode: 400 })
  }
  const d = await prisma.distributor.findUnique({ where: { id: distributorId } })
  if (!d) {
    throw Object.assign(new Error('Distribuidora não encontrada.'), { statusCode: 404 })
  }
  return d
}

const requireDistributor = requireRole('DISTRIBUTOR')

export async function distributorRoutes(app: FastifyInstance) {
  // GET /distributors/me — distributor profile
  app.get('/me', { preHandler: requireDistributor }, async (req) => {
    const distId = (req as any).user?.distributorId
    return getMeDistributor(distId)
  })

  // GET /distributors/me/stats — metrics for distributor dashboard
  app.get('/me/stats', { preHandler: requireDistributor }, async (req) => {
    const distId = (req as any).user?.distributorId
    const dist = await getMeDistributor(distId)

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [ordersToday, inDelivery, monthlyOrders, avgRating] = await Promise.all([
      prisma.order.count({ where: { distributorId: dist.id, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { distributorId: dist.id, status: 'IN_DELIVERY' } }),
      prisma.order.aggregate({
        where: { distributorId: dist.id, status: 'DELIVERED', createdAt: { gte: startOfMonth } },
        _sum: { total: true },
      }),
      prisma.rating.aggregate({
        where: { distributorId: dist.id },
        _avg: { score: true },
      }),
    ])

    return {
      ordersToday,
      inDelivery,
      monthlyRevenue: Number(monthlyOrders._sum.total ?? 0),
      avgRating: Number(avgRating._avg?.score ?? dist.rating),
    }
  })

  // GET /distributors/me/orders — list distributor orders with optional status filter
  app.get('/me/orders', { preHandler: requireDistributor }, async (req) => {
    const distId = (req as any).user?.distributorId
    const dist = await getMeDistributor(distId)
    const { status, limit } = req.query as { status?: string; limit?: string }

    const where: any = { distributorId: dist.id }
    if (status) where.status = status

    return prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    })
  })

  // PATCH /distributors/me — update distributor settings (e.g. cashbackPercent)
  app.patch('/me', { preHandler: requireDistributor }, async (req) => {
    const distId = (req as any).user?.distributorId
    const dist = await getMeDistributor(distId)
    const { cashbackPercent } = req.body as { cashbackPercent?: number }

    return prisma.distributor.update({
      where: { id: dist.id },
      data: { ...(cashbackPercent !== undefined && { cashbackPercent }) },
    })
  })

  // GET /distributors/me/products — catalog
  app.get('/me/products', { preHandler: requireDistributor }, async (req) => {
    const distId = (req as any).user?.distributorId
    const dist = await getMeDistributor(distId)
    return prisma.product.findMany({
      where: { distributorId: dist.id },
      orderBy: { price: 'asc' },
    })
  })

  // POST /distributors/me/products — create product
  app.post('/me/products', { preHandler: requireDistributor }, async (req, reply) => {
    const distId = (req as any).user?.distributorId
    const dist = await getMeDistributor(distId)
    const body = req.body as any

    const product = await prisma.product.create({
      data: {
        distributorId: dist.id,
        name: body.name,
        description: body.description,
        price: body.price,
        unit: 'unidade',
        isAvailable: body.isAvailable ?? true,
      },
    })
    return reply.status(201).send(product)
  })

  // PATCH /distributors/me/orders/:orderId/status — distributor updates their own order
  app.patch('/me/orders/:orderId/status', { preHandler: requireDistributor }, async (req, reply) => {
    const distId = (req as any).user?.distributorId
    const { orderId } = req.params as { orderId: string }
    const { status } = req.body as { status: string }

    const { count } = await prisma.order.updateMany({
      where: { id: orderId, distributorId: distId },
      data: { status: status as any },
    })
    if (count === 0) {
      return reply.status(404).send({ error: 'Pedido não encontrado nesta distribuidora.' })
    }
    return prisma.order.findUnique({ where: { id: orderId } })
  })

  // PATCH /distributors/me/products/:productId — update product
  app.patch('/me/products/:productId', { preHandler: requireDistributor }, async (req, reply) => {
    const distId = (req as any).user?.distributorId
    const { productId } = req.params as { productId: string }
    const body = req.body as any
    const { name, description, price, isAvailable, unit } = body

    const { count } = await prisma.product.updateMany({
      where: { id: productId, distributorId: distId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(unit !== undefined && { unit }),
      },
    })
    if (count === 0) {
      return reply.status(404).send({ error: 'Produto não encontrado nesta distribuidora.' })
    }
    return prisma.product.findUnique({ where: { id: productId } })
  })

  // POST /distributors — onboard new distributor (credenciadorId always comes
  // from the authenticated account, never the request body)
  app.post('/', { preHandler: requireRole('CREDENCIADOR') }, async (req, reply) => {
    const body = CreateDistributorSchema.parse(req.body)
    const credenciadorId = (req as any).user.id as string

    const asaasAccount = await createSubAccount({
      name: body.name,
      email: body.email ?? `${body.cnpj}@gaspago.app`,
      cpfCnpj: body.cnpj,
      mobilePhone: body.phone,
      address: body.address,
      addressNumber: '0',
      province: body.city,
      postalCode: body.postalCode,
    })

    const distributor = await prisma.distributor.create({
      data: {
        ...body,
        credenciadorId,
        asaasSubAccountId: asaasAccount.id,
        asaasPixKey: asaasAccount.walletId,
      },
    })

    await prisma.asaasSubAccount.create({
      data: { actorType: 'DISTRIBUTOR', actorId: distributor.id, asaasAccountId: asaasAccount.id, pixKey: asaasAccount.walletId },
    })

    return reply.status(201).send(distributor)
  })

  // GET /distributors/:id
  app.get('/:id', async (req) => {
    const { id } = req.params as { id: string }
    return prisma.distributor.findUniqueOrThrow({ where: { id }, include: { products: true } })
  })

  // PATCH /distributors/:id/cashback — update cashback offer
  app.patch('/:id/cashback', async (req) => {
    const { id } = req.params as { id: string }
    const { cashbackPercent } = req.body as { cashbackPercent: number }
    return prisma.distributor.update({ where: { id }, data: { cashbackPercent } })
  })
}
