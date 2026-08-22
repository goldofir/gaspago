import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { requireRole } from '../shared/auth.middleware'

const requireEstablishment = requireRole('ESTABLISHMENT')

const ItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().default(true),
})

export async function catalogRoutes(app: FastifyInstance) {
  // GET /pos/me/catalog
  app.get('/me/catalog', { preHandler: requireEstablishment }, async (req) => {
    const establishmentId = (req as any).user?.establishmentId
    if (!establishmentId) return []
    return prisma.marketplaceItem.findMany({ where: { establishmentId }, orderBy: { name: 'asc' } })
  })

  // POST /pos/me/catalog
  app.post('/me/catalog', { preHandler: requireEstablishment }, async (req, reply) => {
    const establishmentId = (req as any).user?.establishmentId
    if (!establishmentId) return reply.status(400).send({ error: 'Conta não vinculada a um estabelecimento.' })
    const body = ItemSchema.parse(req.body)
    const item = await prisma.marketplaceItem.create({ data: { ...body, establishmentId } })
    return reply.status(201).send(item)
  })

  // PATCH /pos/me/catalog/:id
  app.patch('/me/catalog/:id', { preHandler: requireEstablishment }, async (req, reply) => {
    const establishmentId = (req as any).user?.establishmentId
    const { id } = req.params as { id: string }
    const body = ItemSchema.partial().parse(req.body)
    const { count } = await prisma.marketplaceItem.updateMany({ where: { id, establishmentId }, data: body })
    if (count === 0) return reply.status(404).send({ error: 'Item não encontrado.' })
    return prisma.marketplaceItem.findUnique({ where: { id } })
  })

  // DELETE /pos/me/catalog/:id — soft delete
  app.delete('/me/catalog/:id', { preHandler: requireEstablishment }, async (req, reply) => {
    const establishmentId = (req as any).user?.establishmentId
    const { id } = req.params as { id: string }
    const { count } = await prisma.marketplaceItem.updateMany({ where: { id, establishmentId }, data: { isAvailable: false } })
    if (count === 0) return reply.status(404).send({ error: 'Item não encontrado.' })
    return reply.send({ ok: true })
  })
}
