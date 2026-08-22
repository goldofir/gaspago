import { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '../shared/prisma'
import { createPixCharge, internalTransfer } from './asaas.client'
import { config } from '../config'
import { distributeCommissionsPos } from '../commissions/pos-commission.service'
import { queueRedemptionPullback } from '../wallet/wallet-treasury.service'
import { requireRole } from '../shared/auth.middleware'

const secret = new TextEncoder().encode(config.pos.qrJwtSecret)

const GenerateQrSchema = z.object({
  establishmentId: z.string().optional(),
  amount: z.number().positive(),
})

const ScanQrSchema = z.object({
  qrToken: z.string(),
  fgolToUse: z.number().min(0).default(0),
})

async function getMeEstablishment(establishmentId?: string) {
  if (!establishmentId) {
    throw Object.assign(new Error('Conta não vinculada a um estabelecimento.'), { statusCode: 400 })
  }
  const est = await prisma.establishment.findUnique({ where: { id: establishmentId } })
  if (!est) {
    throw Object.assign(new Error('Estabelecimento não encontrado.'), { statusCode: 404 })
  }
  return est
}

const requireEstablishment = requireRole('ESTABLISHMENT')

export async function posRoutes(app: FastifyInstance) {
  // GET /pos/me — establishment profile for the logged-in POS account
  app.get('/me', { preHandler: requireEstablishment }, async (req) => {
    return getMeEstablishment((req as any).user?.establishmentId)
  })

  // POST /pos/charge — POS web panel generates QR charge
  app.post('/charge', { preHandler: requireEstablishment }, async (req, reply) => {
    const body = GenerateQrSchema.parse(req.body)
    // establishmentId always comes from the authenticated staff account, never the body —
    // otherwise a POS terminal could generate a charge against a different establishment.
    const est = await getMeEstablishment((req as any).user?.establishmentId)

    const expiresAt = new Date(Date.now() + config.pos.qrExpiresMinutes * 60_000)
    const marginOffered = body.amount * est.cashbackPercent
    const id = randomUUID()

    const token = await new SignJWT({ posPaymentId: id, establishmentId: est.id, totalAmount: body.amount, exp: expiresAt.getTime() })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(expiresAt)
      .sign(secret)

    const posPayment = await prisma.posPayment.create({
      data: {
        id,
        establishmentId: est.id,
        // customerId stays unset — unknown until someone scans the QR (see /scan)
        totalAmount: body.amount,
        pixAmount: body.amount,
        marginOffered,
        cashbackPercent: est.cashbackPercent,
        qrToken: token,
        qrExpiresAt: expiresAt,
        status: 'AWAITING_SCAN',
      },
    })

    return reply.status(201).send({
      id: posPayment.id,
      qrToken: token,
      expiresAt,
      totalAmount: body.amount,
      establishmentName: est.name,
    })
  })

  // GET /pos/charge/:id/status — POS web panel polls for status
  app.get('/charge/:id/status', { preHandler: requireEstablishment }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const payment = await prisma.posPayment.findUniqueOrThrow({ where: { id } })
    if (payment.establishmentId !== (req as any).user?.establishmentId) {
      return reply.status(404).send({ error: 'Cobrança não encontrada.' })
    }

    // Check expiration
    if (payment.status === 'AWAITING_SCAN' && payment.qrExpiresAt < new Date()) {
      await prisma.posPayment.update({ where: { id }, data: { status: 'EXPIRED' } })
      return { status: 'EXPIRED', fgolUsed: 0, pixAmount: 0, cashbackAmount: 0 }
    }

    return {
      status: payment.status,
      fgolUsed: Number(payment.fgolUsed),
      pixAmount: Number(payment.pixAmount),
      cashbackAmount: Number(payment.marginOffered) * config.commission.consumerPct,
    }
  })

  // POST /pos/scan — mobile app scans QR code and confirms payment
  app.post('/scan', async (req, reply) => {
    const body = ScanQrSchema.parse(req.body)
    let customerId: string | null = null
    try {
      await (req as any).jwtVerify()
      customerId = (req as any).user?.id ?? null
    } catch {
      // no valid Authorization header — guest payment, customerId stays null
    }

    let payload: any
    try {
      const res = await jwtVerify(body.qrToken, secret)
      payload = res.payload
    } catch {
      return reply.status(400).send({ error: 'QR Code inválido ou expirado' })
    }

    const posPaymentId = String(payload.posPaymentId)
    const totalAmountNum = Number(payload.totalAmount ?? 0)
    const establishmentId = String(payload.establishmentId)

    const posPayment = await prisma.posPayment.findUniqueOrThrow({ where: { id: posPaymentId } })

    if (posPayment.status !== 'AWAITING_SCAN') {
      return reply.status(409).send({ error: 'QR Code já utilizado ou cancelado' })
    }

    if (body.fgolToUse > 0 && customerId === null) {
      return reply.status(401).send({ error: 'Entre na sua conta para usar saldo FGOL neste pagamento.' })
    }

    const est = await prisma.establishment.findUniqueOrThrow({ where: { id: establishmentId } })
    const fgolBrlValue = body.fgolToUse
    const pixAmount = Math.max(0, totalAmountNum - fgolBrlValue)

    // Debit FGOL balance if used
    if (body.fgolToUse > 0 && customerId !== null) {
      const user = await prisma.user.findUnique({ where: { id: customerId } })
      if (!user || Number(user.fgolBalance) < body.fgolToUse) {
        return reply.status(400).send({ error: 'Saldo FGOL insuficiente' })
      }
      await prisma.user.update({ where: { id: customerId }, data: { fgolBalance: { decrement: body.fgolToUse } } })
    }

    await prisma.posPayment.update({
      where: { id: posPaymentId },
      data: {
        customerId,
        fgolUsed: body.fgolToUse,
        fgolBrlValue,
        pixAmount,
        status: 'PAID',
        settledAt: new Date(),
      },
    })

    const settled = await prisma.posPayment.findUniqueOrThrow({ where: { id: posPaymentId } })
    await distributeCommissionsPos(settled)

    // DB balance already settled the sale above (the establishment's PIX side is done)
    // — pulling the equivalent FGOL back from the wallet on-chain is queued for the
    // background worker and never blocks the in-person payment.
    if (body.fgolToUse > 0 && customerId !== null) {
      await queueRedemptionPullback(customerId, body.fgolToUse, 'pos_payment', settled.id)
    }

    return reply.send({
      posPaymentId: settled.id,
      establishmentName: est.name,
      totalAmount: settled.totalAmount,
      fgolUsed: body.fgolToUse,
      pixAmount,
    })
  })

  // GET /pos/me/history — history of POS charges for establishment
  app.get('/me/history', { preHandler: requireEstablishment }, async (req) => {
    const est = await getMeEstablishment((req as any).user?.establishmentId)
    const limit = parseInt((req.query as any)?.limit ?? '50')

    return prisma.posPayment.findMany({
      where: { establishmentId: est.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  })
}
