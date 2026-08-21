import type { FastifyInstance } from 'fastify'
import { testSmtp } from '../shared/email.service'

export async function emailRoutes(app: FastifyInstance) {
  app.post('/email/test', {
    schema: {
      body: {
        type: 'object',
        required: ['to'],
        properties: { to: { type: 'string', format: 'email' } },
      },
    },
  }, async (req, reply) => {
    const { to } = req.body as { to: string }
    await testSmtp(to)
    return reply.send({ ok: true, message: `E-mail de teste enviado para ${to}` })
  })
}
