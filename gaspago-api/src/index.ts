import Fastify from 'fastify'
import { config } from './config'
import { SystemConfigService } from './shared/system-config.service'
import { orderRoutes } from './orders/order.routes'
import { distributorRoutes } from './distributors/distributor.routes'
import { affiliateRoutes } from './affiliates/affiliate.routes'
import { paymentRoutes } from './payments/payment.routes'
import { posRoutes } from './payments/pos.routes'
import { waWebhookRoutes } from './whatsapp/webhook.routes'
import { asaasWebhookRoutes } from './payments/asaas.webhook'
import { adminRoutes } from './admin/admin.routes'
import { authRoutes } from './auth/auth.routes'
import { googleAuthRoutes } from './auth/google.routes'
import { portalAuthRoutes } from './auth/portal.routes'
import { notificationRoutes } from './notifications/notification.routes'
import { subscriptionRoutes } from './subscriptions/subscription.routes'

import { credenciadorRoutes } from './credenciador/credenciador.routes'
import { establishmentRoutes } from './establishments/establishment.routes'
import { marketplaceRoutes } from './marketplace/marketplace.routes'
import { catalogRoutes } from './marketplace/catalog.routes'
import { partnerLeadRoutes } from './leads/partner-lead.routes'
import { kycRoutes } from './kyc/kyc.routes'
import { kycAdminRoutes } from './admin/kyc.admin.routes'
import { publicConfigRoutes } from './shared/public-config.routes'
import { startSchedulers } from './shared/scheduler'


async function bootstrap() {
  await SystemConfigService.loadAll()

  const app = Fastify({ logger: { level: config.logLevel } })

  await app.register(require('@fastify/cors'), { origin: true })
  await app.register(require('@fastify/jwt'), { secret: config.jwtSecret })

  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false, // API only serves JSON, not HTML — CSP not needed here
  })

  await app.register(require('@fastify/rate-limit'), {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })

  app.register(orderRoutes, { prefix: '/orders' })
  app.register(distributorRoutes, { prefix: '/distributors' })
  app.register(affiliateRoutes, { prefix: '/affiliates' })
  app.register(kycRoutes, { prefix: '/kyc' })
  app.register(kycAdminRoutes, { prefix: '/admin/kyc' })
  app.register(paymentRoutes, { prefix: '/payments' })
  app.register(posRoutes, { prefix: '/pos' })
  app.register(catalogRoutes, { prefix: '/pos' })
  app.register(credenciadorRoutes, { prefix: '/credenciador' })
  app.register(establishmentRoutes, { prefix: '/establishments' })
  app.register(marketplaceRoutes, { prefix: '/marketplace' })
  app.register(waWebhookRoutes, { prefix: '/webhook' })
  app.register(asaasWebhookRoutes)
  app.register(authRoutes, { prefix: '/auth' })
  app.register(googleAuthRoutes, { prefix: '/auth' })
  app.register(portalAuthRoutes, { prefix: '/auth' })
  app.register(adminRoutes, { prefix: '/admin' })
  app.register(notificationRoutes, { prefix: '/notifications' })
  app.register(subscriptionRoutes, { prefix: '/subscriptions' })
  app.register(partnerLeadRoutes, { prefix: '/partner-leads' })
  app.register(publicConfigRoutes)


  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err)
    if (err.name === 'ZodError') {
      return reply.status(400).send({ error: 'Validation error', issues: (err as any).issues })
    }
    const status = (err as any).statusCode ?? 500
    return reply.status(status).send({ error: err.message })
  })

  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  await app.listen({ port: config.port, host: '0.0.0.0' })
  startSchedulers(app)
  app.log.info(`API rodando na porta ${config.port}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
