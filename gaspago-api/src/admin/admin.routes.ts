import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../shared/prisma'
import { runMonthlyCommissionCron } from '../commissions/commission.cron'
import { getBalance } from '../payments/asaas.client'
import { credentialsRoutes } from './credentials.routes'
import { emailRoutes } from './email.routes'
import { storageRoutes } from './storage.routes'
import { authRoutes } from './auth.routes'
import { usersRoutes } from './users.routes'
import { revenueRoutes } from './revenue.routes'
import { ordersAdminRoutes } from './orders.admin.routes'
import { distributorsAdminRoutes } from './distributors.admin.routes'
import { subscriptionsAdminRoutes } from './subscriptions.admin.routes'
import { establishmentsAdminRoutes } from './establishments.admin.routes'
import { plansAdminRoutes } from './plans.admin.routes'
import { partnerLeadsAdminRoutes } from './partner-leads.admin.routes'
import { invoicesAdminRoutes } from './invoices.admin.routes'
import { requireAdminAuth } from './admin.middleware'

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    // skip the login endpoint
    if (request.url === '/admin/auth/login' && request.method === 'POST') return
    await requireAdminAuth(request, reply)
  })

  app.register(authRoutes, { prefix: '/auth' })
  app.register(credentialsRoutes, { prefix: '/credentials' })
  app.register(emailRoutes)
  app.register(storageRoutes)
  app.register(usersRoutes)
  app.register(revenueRoutes)
  app.register(ordersAdminRoutes)
  app.register(distributorsAdminRoutes)
  app.register(subscriptionsAdminRoutes)
  app.register(establishmentsAdminRoutes)
  app.register(plansAdminRoutes)
  app.register(partnerLeadsAdminRoutes)
  app.register(invoicesAdminRoutes)

  // POST /admin/notifications/broadcast
  app.post('/notifications/broadcast', async (req, reply) => {
    const { title, body, userIds } = req.body as { title: string; body: string; userIds?: string[] }
    const { NotificationService } = require('../notifications/notification.service')
    if (userIds?.length) {
      await NotificationService.sendToMany(userIds, title, body)
    } else {
      const users = await prisma.user.findMany({ where: { pushToken: { not: null } }, select: { id: true } })
      await NotificationService.sendToMany(users.map((u: any) => u.id), title, body)
    }
    return reply.send({ ok: true })
  })

  // POST /admin/portal-accounts — provision (or reset) a login for a distributor,
  // credenciador, or POS/establishment staff member. SuperAdmin-only (protected by
  // the preHandler above). Passwords are always bcrypt-hashed before storage.
  const PortalAccountSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    role: z.enum(['DISTRIBUTOR', 'CREDENCIADOR', 'ESTABLISHMENT']),
    name: z.string().optional(),
    phone: z.string(),
    distributorId: z.string().optional(),
    establishmentId: z.string().optional(),
  })

  app.post('/portal-accounts', async (req, reply) => {
    const body = PortalAccountSchema.parse(req.body)

    if (body.role === 'DISTRIBUTOR' && !body.distributorId) {
      return reply.status(400).send({ error: 'distributorId é obrigatório para o papel DISTRIBUTOR' })
    }
    if (body.role === 'ESTABLISHMENT' && !body.establishmentId) {
      return reply.status(400).send({ error: 'establishmentId é obrigatório para o papel ESTABLISHMENT' })
    }

    const passwordHash = await bcrypt.hash(body.password, 10)

    const user = await prisma.user.upsert({
      where: { phone: body.phone },
      update: {
        email: body.email,
        name: body.name,
        actorType: body.role,
        passwordHash,
        distributorId: body.distributorId,
        establishmentId: body.establishmentId,
      },
      create: {
        phone: body.phone,
        email: body.email,
        name: body.name,
        actorType: body.role,
        affiliateStatus: 'ACTIVE',
        passwordHash,
        distributorId: body.distributorId,
        establishmentId: body.establishmentId,
      },
    })

    return reply.status(201).send({ id: user.id, email: user.email, role: user.actorType })
  })

  // POST /admin/cron/monthly — manual trigger (also set up on Railway scheduler)
  app.post('/cron/monthly', async (_req, reply) => {
    await runMonthlyCommissionCron()
    return reply.send({ ok: true })
  })

  // GET /admin/float — platform wallet balance (calls Asaas)
  app.get('/float', async (_req, reply) => {
    try {
      const balance = await getBalance()
      return { balance: balance.balance }
    } catch (err) {
      app.log.error({ err }, '[admin] Failed to fetch Asaas balance')
      return reply.status(200).send({ balance: null, error: 'Não foi possível consultar o saldo Asaas. Verifique a API Key em Credenciais.' })
    }
  })
}
