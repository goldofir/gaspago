import { FastifyInstance } from 'fastify'
import { config } from '../config'
import { handleIncomingMessage } from './handler'

export async function waWebhookRoutes(app: FastifyInstance) {
  // Conexbot forwards WA events here
  app.post('/wa', {
    config: { rawBody: true },
  }, async (req, reply) => {
    const sig = req.headers['x-conexbot-signature'] as string
    if (sig !== config.conexbot.webhookSecret) {
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
  timestamp: number
}
