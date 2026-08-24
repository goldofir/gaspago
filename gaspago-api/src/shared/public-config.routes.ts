import { FastifyInstance } from 'fastify'
import { SystemConfigService } from './system-config.service'

// Non-secret values the public site needs at runtime but that live in the
// SuperAdmin-managed DB config, not a build-time env var — same reasoning as
// GET /auth/google-client-id.
export async function publicConfigRoutes(app: FastifyInstance) {
  app.get('/public-config', async () => {
    return {
      whatsappOrderNumber: SystemConfigService.get('WHATSAPP_ORDER_NUMBER') || null,
    }
  })
}
