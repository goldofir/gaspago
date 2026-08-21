import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'

export async function paymentRoutes(app: FastifyInstance) {
  // Asaas webhook — called when PIX is confirmed
  app.post('/asaas/webhook', async (req, reply) => {
    const event = req.body as { event: string; payment: { id: string; status: string; externalReference?: string } }
    if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
      const order = await prisma.order.findFirst({ where: { asaasChargeId: event.payment.id } })
      if (order) {
        await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID' } })
      }
    }
    reply.send({ ok: true })
  })
}
