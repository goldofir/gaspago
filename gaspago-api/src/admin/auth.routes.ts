import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../shared/prisma'

export async function authRoutes(app: FastifyInstance) {
  // POST /admin/auth/login
  // Body: { email: string, password: string }
  // Strategy (MVP): compare against env vars ADMIN_EMAIL / ADMIN_PASSWORD.
  // In production, extend to query User table for actorType ADMIN | SUPERADMIN
  // and compare against a proper bcrypt hash stored in the DB.
  app.post<{ Body: { email: string; password: string } }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              role:  { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body

      // Primary check: DB-backed superadmin/admin user with a bcrypt hash.
      try {
        const user = await prisma.user.findFirst({
          where: { email, actorType: { in: ['SUPERADMIN', 'ADMIN'] as any } },
        })

        if (user?.passwordHash) {
          const valid = await bcrypt.compare(password, user.passwordHash)
          if (valid) {
            const token = (app as any).jwt.sign(
              { id: user.id, role: 'superadmin' },
              { expiresIn: '24h' },
            )
            return reply.send({ token, role: 'superadmin' })
          }
          return reply.status(401).send({ error: 'Credenciais inválidas' })
        }
      } catch {
        // DB unavailable — fall through to the env-var bootstrap path
      }

      // Bootstrap path: first-deploy access before a DB admin user exists.
      // Prefers a bcrypt hash (ADMIN_PASSWORD_HASH); falls back to legacy
      // plaintext (ADMIN_PASSWORD) only if no hash is configured.
      const adminEmail = process.env.ADMIN_EMAIL ?? ''
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ?? ''
      const adminPasswordPlain = process.env.ADMIN_PASSWORD ?? ''

      if (adminEmail && email === adminEmail) {
        let ok = false
        if (adminPasswordHash) {
          ok = await bcrypt.compare(password, adminPasswordHash)
        } else if (adminPasswordPlain) {
          console.warn('[admin/auth] ADMIN_PASSWORD_HASH not set — comparing against plaintext ADMIN_PASSWORD. Set ADMIN_PASSWORD_HASH (bcrypt) for production.')
          ok = password === adminPasswordPlain
        }

        if (ok) {
          const token = (app as any).jwt.sign(
            { id: 'superadmin', role: 'superadmin' },
            { expiresIn: '24h' },
          )
          return reply.send({ token, role: 'superadmin' })
        }
      }

      return reply.status(401).send({ error: 'Credenciais inválidas' })
    },
  )

  // GET /admin/auth/me
  // Verifies the JWT from Authorization: Bearer <token>
  // Returns { id, role } of the authenticated admin
  app.get(
    '/me',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              id:   { type: 'string' },
              role: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        await (req as any).jwtVerify()
      } catch {
        return reply.status(401).send({ error: 'Token inválido ou expirado' })
      }

      const payload = (req as any).user as { id: string; role: string }
      return reply.send({ id: payload.id, role: payload.role })
    },
  )
}
