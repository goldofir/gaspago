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
    try {
      await testSmtp(to)
      return reply.send({ ok: true, message: `E-mail de teste enviado para ${to}` })
    } catch (err: any) {
      return reply.status(400).send({ ok: false, error: err?.message ?? 'Falha ao enviar e-mail de teste. Verifique as credenciais SMTP em Credenciais.' })
    }
  })
}
