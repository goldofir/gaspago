import { FastifyInstance } from 'fastify'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'
import { finalizePosPayment } from './pos-payment.service'

export async function asaasWebhookRoutes(app: FastifyInstance) {
  app.post('/webhook/asaas', {
    schema: {
      body: {
        type: 'object',
        properties: {
          event: { type: 'string' },
          payment: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              externalReference: { type: 'string' },
              value: { type: 'number' },
            },
            required: ['id'],
          },
        },
        required: ['event', 'payment'],
      },
    },
  }, async (request, reply) => {
    // 1. Verify webhook token
    const configuredToken = SystemConfigService.get('ASAAS_WEBHOOK_TOKEN')

    if (configuredToken) {
      const authHeader = request.headers['authorization']
      const tokenQuery = (request.query as Record<string, string>)['token']
      const receivedToken = authHeader ?? tokenQuery

      if (receivedToken !== configuredToken) {
        app.log.warn({ receivedToken }, 'asaas.webhook: token mismatch — rejecting request')
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    } else {
      app.log.warn('asaas.webhook: ASAAS_WEBHOOK_TOKEN not configured — skipping token verification')
    }

    const { event, payment } = request.body as {
      event: string
      payment: { id: string; status?: string; externalReference?: string; value?: number }
    }

    app.log.info({ event, paymentId: payment.id }, 'asaas.webhook: received event')

    // 2. Handle event types
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const posPayment = await prisma.posPayment.findFirst({ where: { asaasChargeId: payment.id } })
      if (posPayment) {
        if (posPayment.status === 'AWAITING_PAYMENT') {
          await prisma.posPayment.update({ where: { id: posPayment.id }, data: { status: 'PAID', settledAt: new Date() } })
          await finalizePosPayment(posPayment.id)
          app.log.info({ posPaymentId: posPayment.id, event }, 'asaas.webhook: POS payment confirmed')
        } else {
          app.log.info({ posPaymentId: posPayment.id, status: posPayment.status }, 'asaas.webhook: POS payment already settled, ignoring duplicate event')
        }
        return reply.send({ ok: true })
      }

      const order = await prisma.order.findFirst({
        where: { asaasChargeId: payment.id },
      })

      if (!order) {
        app.log.warn({ paymentId: payment.id, event }, 'asaas.webhook: no order or POS payment found for paymentId')
        return reply.send({ ok: true, event: 'not_found' })
      }

      const updates: Record<string, unknown> = { paymentStatus: 'PAID' }
      if (order.status === 'PENDING') {
        updates.status = 'CONFIRMED'
      }

      await prisma.order.update({
        where: { id: order.id },
        data: updates,
      })

      app.log.info({ orderId: order.id, event }, 'asaas.webhook: order payment confirmed')
      return reply.send({ ok: true })
    }

    if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED') {
      const posPayment = await prisma.posPayment.findFirst({ where: { asaasChargeId: payment.id } })
      if (posPayment) {
        if (posPayment.status === 'AWAITING_PAYMENT') {
          await prisma.posPayment.update({ where: { id: posPayment.id }, data: { status: 'CANCELLED' } })
          app.log.info({ posPaymentId: posPayment.id, event }, 'asaas.webhook: POS payment cancelled/overdue')
        }
        return reply.send({ ok: true })
      }

      const order = await prisma.order.findFirst({
        where: { asaasChargeId: payment.id },
      })

      if (!order) {
        app.log.warn({ paymentId: payment.id, event }, 'asaas.webhook: no order or POS payment found for paymentId')
        return reply.send({ ok: true, event: 'not_found' })
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'FAILED' },
      })

      app.log.info({ orderId: order.id, event }, 'asaas.webhook: order payment marked as failed')
      return reply.send({ ok: true })
    }

    // Any other event — ignore gracefully
    app.log.info({ event }, 'asaas.webhook: ignoring unhandled event')
    return reply.send({ ok: true, event: 'ignored' })
  })
}
