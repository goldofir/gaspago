import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'

const DeviceTokenSchema = z.object({
  pushToken: z.string(),
})

export async function notificationRoutes(app: FastifyInstance) {
  // POST /notifications/device-token
  app.post('/device-token', async (req, reply) => {
    await (req as any).jwtVerify()
    const userId = (req as any).user.id
    const { pushToken } = DeviceTokenSchema.parse(req.body)
    await prisma.user.update({ where: { id: userId }, data: { pushToken } })
    return reply.send({ ok: true })
  })
}
