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
  // Whole percent (0-100) from the form, same convention as every other
  // cashbackPercent input in this app — converted to the 0-1 fraction the
  // rest of the codebase (and the DB column) actually uses. Null clears the
  // override so the item falls back to the establishment's own %.
  cashbackPercentOverride: z.number().min(0).max(100).nullable().optional(),
})

function toStoredPct(body: { cashbackPercentOverride?: number | null }) {
  if (body.cashbackPercentOverride === undefined) return {}
  return { cashbackPercentOverride: body.cashbackPercentOverride === null ? null : body.cashbackPercentOverride / 100 }
}

function toDisplay(item: any) {
  return { ...item, cashbackPercentOverride: item.cashbackPercentOverride == null ? null : item.cashbackPercentOverride * 100 }
}

export async function catalogRoutes(app: FastifyInstance) {
  // GET /pos/me/catalog
  app.get('/me/catalog', { preHandler: requireEstablishment }, async (req) => {
    const establishmentId = (req as any).user?.establishmentId
    if (!establishmentId) return []
    const items = await prisma.marketplaceItem.findMany({ where: { establishmentId }, orderBy: { name: 'asc' } })
    return items.map(toDisplay)
  })

  // POST /pos/me/catalog
  app.post('/me/catalog', { preHandler: requireEstablishment }, async (req, reply) => {
    const establishmentId = (req as any).user?.establishmentId
    if (!establishmentId) return reply.status(400).send({ error: 'Conta não vinculada a um estabelecimento.' })
    const body = ItemSchema.parse(req.body)
    const { cashbackPercentOverride, ...rest } = body
    const item = await prisma.marketplaceItem.create({ data: { ...rest, establishmentId, ...toStoredPct(body) } })
    return reply.status(201).send(toDisplay(item))
  })

  // PATCH /pos/me/catalog/:id
  app.patch('/me/catalog/:id', { preHandler: requireEstablishment }, async (req, reply) => {
    const establishmentId = (req as any).user?.establishmentId
    const { id } = req.params as { id: string }
    const body = ItemSchema.partial().parse(req.body)
    const { cashbackPercentOverride, ...rest } = body
    const { count } = await prisma.marketplaceItem.updateMany({ where: { id, establishmentId }, data: { ...rest, ...toStoredPct(body) } })
    if (count === 0) return reply.status(404).send({ error: 'Item não encontrado.' })
    const item = await prisma.marketplaceItem.findUniqueOrThrow({ where: { id } })
    return toDisplay(item)
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
