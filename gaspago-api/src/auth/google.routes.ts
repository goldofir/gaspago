import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import axios from 'axios'
import { prisma } from '../shared/prisma'
import { SystemConfigService } from '../shared/system-config.service'

const bodySchema = z.object({
  idToken: z.string(),
})

export async function googleAuthRoutes(app: FastifyInstance) {
  app.post('/google', async (request, reply) => {
    const parseResult = bodySchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'idToken é obrigatório' })
    }

    const { idToken } = parseResult.data

    // 1. Verify token via Google tokeninfo endpoint
    let tokenInfo: Record<string, string>
    try {
      const res = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: idToken },
      })
      if (res.data.error) {
        return reply.status(401).send({ error: 'Token Google inválido' })
      }
      tokenInfo = res.data
    } catch {
      return reply.status(401).send({ error: 'Token Google inválido' })
    }

    // 2. Extract fields from tokeninfo response
    const { sub: googleId, email, name, picture: avatarUrl, aud } = tokenInfo

    // 3. Optionally verify aud matches GOOGLE_CLIENT_ID
    const expectedClientId = SystemConfigService.get('GOOGLE_CLIENT_ID')
    if (expectedClientId && aud !== expectedClientId) {
      return reply.status(401).send({ error: 'Client ID inválido' })
    }

    // 4. Upsert user by googleId (prefer) or by email
    let user = await prisma.user.findUnique({ where: { googleId } })

    if (!user && email) {
      const existingByEmail = await prisma.user.findFirst({ where: { email } })
      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            avatarUrl: avatarUrl ?? undefined,
          },
        })
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatarUrl,
          phone: googleId,
          actorType: 'CONSUMER',
          affiliateStatus: 'ACTIVE',
        },
      })
    }

    // 5. Sign JWT
    const token = (app as any).jwt.sign(
      { id: user.id, phone: user.phone, role: user.actorType },
      { expiresIn: '30d' },
    )

    // 6. Return token and user
    return reply.send({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        avatarUrl: (user as any).avatarUrl,
        actorType: user.actorType,
        affiliateStatus: user.affiliateStatus,
        fgolBalance: user.fgolBalance,
      },
    })
  })
}
