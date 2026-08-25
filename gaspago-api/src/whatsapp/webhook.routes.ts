import { FastifyInstance } from 'fastify'
import { SystemConfigService } from '../shared/system-config.service'
import { handleIncomingMessage } from './handler'

export async function waWebhookRoutes(app: FastifyInstance) {
  // Conexbot forwards WA events here
  app.post('/wa', {
    config: { rawBody: true },
  }, async (req, reply) => {
    // config.conexbot.webhookSecret reads process.env directly, which is never
    // populated (the real secret only lives in SystemConfig/Postgres, same as
    // every other Conexbot credential) — that made this comparison always
    // undefined === undefined on an unsigned request, accepting anything.
    const configuredSecret = SystemConfigService.get('CONEXBOT_WEBHOOK_SECRET')
    const sig = req.headers['x-conexbot-signature'] as string | undefined
    if (!configuredSecret) {
      app.log.warn('whatsapp.webhook: CONEXBOT_WEBHOOK_SECRET not configured — rejecting all requests')
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    if (sig !== configuredSecret) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    const event = req.body as WAEvent
    await handleIncomingMessage(event)
    reply.send({ ok: true })
  })
}

export interface WAEvent {
  type: 'message' | 'status'
  from: string         // E.164 phone number
  messageId: string
  text?: string
  listReply?: { id: string; title: string }
  // Native WhatsApp location share (customer tapped the 📎 → Location button).
  // Field names assumed to match Conexbot's normalized shape — not confirmed
  // against real docs; if it differs, location sharing just won't trigger and
  // the CEP fallback still works.
  location?: { lat: number; lng: number }
  // Only present on type: "status" — Conexbot's delivery-receipt event,
  // reporting on a message THIS bot sent earlier (messageId ties back to
  // WaMessage.providerId).
  status?: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: number
}
