import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { prisma } from '../shared/prisma'
import { requireAuth } from '../shared/auth.middleware'
import { distributeCommissionsPos } from '../commissions/pos-commission.service'
import { config } from '../config'

const CATEGORY_LABELS: Record<string, string> = {
  restaurante: 'Restaurantes', farmacia: 'Farmácias', mercado: 'Mercados',
  beleza: 'Beleza & Estética', servico: 'Serviços em casa', pet: 'Pet', educacao: 'Educação', automotivo: 'Automotivo',
}

export async function marketplaceRoutes(app: FastifyInstance) {
  // GET /marketplace/categories — real counts of active establishments per category
  app.get('/categories', async () => {
    const counts = await prisma.establishment.groupBy({ by: ['category'], where: { isActive: true }, _count: true })
    return Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      key, label, count: counts.find(c => c.category === key)?._count ?? 0,
    }))
  })

  // GET /marketplace/establishments?category=&lat=&lng=&cep=
  app.get('/establishments', async (req) => {
    const { category, lat, lng, cep } = req.query as { category?: string; lat?: string; lng?: string; cep?: string }
    const where: any = { isActive: true }
    if (category) where.category = category

    if (lat && lng) {
      const latN = parseFloat(lat), lngN = parseFloat(lng)
      const all = await prisma.establishment.findMany({ where: { ...where, lat: { not: null }, lng: { not: null } } })
      const EARTH_RADIUS_KM = 6371
      const toRad = (d: number) => (d * Math.PI) / 180
      const results = all.map(e => {
        const dLat = toRad(e.lat! - latN), dLng = toRad(e.lng! - lngN)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(latN)) * Math.cos(toRad(e.lat!)) * Math.sin(dLng / 2) ** 2
        const distKm = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return { ...e, distanceKm: Math.round(distKm * 10) / 10 }
      }).sort((a, b) => (b.rating - a.rating) || (a.distanceKm - b.distanceKm)).slice(0, 30)
      return results
    }

    if (cep) {
      where.postalCode = { startsWith: cep.replace(/\D/g, '').slice(0, 5) }
    }
    return prisma.establishment.findMany({ where, orderBy: { rating: 'desc' }, take: 30 })
  })

  // GET /marketplace/establishments/:id — detail + catalog
  app.get('/establishments/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const est = await prisma.establishment.findUnique({
      where: { id },
      include: { marketplaceItems: { where: { isAvailable: true }, orderBy: { name: 'asc' } } },
    })
    if (!est) return reply.status(404).send({ error: 'Estabelecimento não encontrado.' })
    return est
  })

  // POST /marketplace/checkout — logged-in consumer buys directly (no physical QR scan needed,
  // they're already authenticated and already chose the establishment by browsing).
  const CheckoutSchema = z.object({
    establishmentId: z.string(),
    items: z.array(z.object({ itemId: z.string(), quantity: z.number().int().min(1) })).min(1),
    fgolToUse: z.number().min(0).default(0),
  })

  app.post('/checkout', { preHandler: requireAuth }, async (req, reply) => {
    const body = CheckoutSchema.parse(req.body)
    const customerId = (req as any).user.id as string

    const est = await prisma.establishment.findUnique({ where: { id: body.establishmentId } })
    if (!est || !est.isActive) return reply.status(404).send({ error: 'Estabelecimento não encontrado ou inativo.' })

    const itemIds = body.items.map(i => i.itemId)
    const items = await prisma.marketplaceItem.findMany({ where: { id: { in: itemIds }, establishmentId: est.id, isAvailable: true } })
    if (items.length !== itemIds.length) return reply.status(400).send({ error: 'Um ou mais itens não estão disponíveis.' })

    let totalAmount = 0
    for (const line of body.items) {
      const item = items.find(i => i.id === line.itemId)!
      totalAmount += Number(item.price) * line.quantity
    }

    if (body.fgolToUse > 0) {
      const user = await prisma.user.findUnique({ where: { id: customerId } })
      if (!user || Number(user.fgolBalance) < body.fgolToUse) {
        return reply.status(400).send({ error: 'Saldo FGOL insuficiente.' })
      }
      await prisma.user.update({ where: { id: customerId }, data: { fgolBalance: { decrement: body.fgolToUse } } })
    }

    const pixAmount = Math.max(0, totalAmount - body.fgolToUse)
    const marginOffered = totalAmount * est.cashbackPercent

    // No physical QR/scan step in this flow — the record is created already PAID.
    // Real PIX capture (createPixCharge via Asaas) is a follow-up integration; this mirrors
    // the same "mark as settled at creation" simplification the existing /pos/scan flow uses.
    const posPayment = await prisma.posPayment.create({
      data: {
        establishmentId: est.id,
        customerId,
        totalAmount,
        fgolUsed: body.fgolToUse,
        fgolBrlValue: body.fgolToUse,
        pixAmount,
        marginOffered,
        cashbackPercent: est.cashbackPercent,
        qrToken: randomUUID(),
        qrExpiresAt: new Date(),
        status: 'PAID',
        settledAt: new Date(),
      },
    })

    await distributeCommissionsPos(posPayment)

    return reply.status(201).send({
      posPaymentId: posPayment.id,
      establishmentName: est.name,
      totalAmount,
      fgolUsed: body.fgolToUse,
      pixAmount,
      // consumer cashback share — kept in sync with the commission engine via config.commission.consumerPct
      cashbackEarned: Math.round(marginOffered * config.commission.consumerPct * 100) / 100,
    })
  })
}
