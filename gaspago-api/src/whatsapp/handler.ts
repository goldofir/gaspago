import Redis from 'ioredis'
import { prisma } from '../shared/prisma'
import { sendText as sendMessage, sendDistributorOptions } from './client'
import { findDistributorsByPostalCode } from '../orders/routing.service'
import type { WAEvent } from './webhook.routes'

// Conversation state per phone number — was an in-memory Map (lost on every
// restart, never shared across instances). Redis matches the pattern already
// used for OTP sessions (see auth/otp.service.ts) and survives restarts/scaling.
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
const SESSION_PREFIX = 'wa:session:'
const SESSION_TTL_SECONDS = 30 * 60 // conversation goes stale after 30min idle

interface WaSession {
  step: string
  data: Record<string, unknown>
}

async function getSession(phone: string): Promise<WaSession> {
  const raw = await redis.get(SESSION_PREFIX + phone)
  if (!raw) return { step: 'idle', data: {} }
  try {
    return JSON.parse(raw)
  } catch {
    return { step: 'idle', data: {} }
  }
}

async function setSession(phone: string, session: WaSession): Promise<void> {
  await redis.setex(SESSION_PREFIX + phone, SESSION_TTL_SECONDS, JSON.stringify(session))
}

export async function handleIncomingMessage(event: WAEvent) {
  if (event.type !== 'message') return

  const phone = event.from
  const session = await getSession(phone)

  if (session.step === 'idle' || event.text?.toLowerCase().includes('gas') || event.text?.toLowerCase().includes('gás')) {
    await sendMessage(phone, '📍 Qual o seu CEP para encontrar distribuidoras na sua região?')
    await setSession(phone, { step: 'awaiting_cep', data: {} })
    return
  }

  if (session.step === 'awaiting_cep') {
    const cep = event.text?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) {
      await sendMessage(phone, '❌ CEP inválido. Digite os 8 dígitos, ex: 01310100')
      return
    }
    const distributors = await findDistributorsByPostalCode(cep)
    if (!distributors.length) {
      await sendMessage(phone, '😔 Ainda não temos distribuidoras na sua região. Em breve chegaremos aí!')
      await setSession(phone, { step: 'idle', data: {} })
      return
    }
    await sendDistributorOptions(phone, distributors.map(d => ({
      id: d.id,
      name: d.name,
      price: d.products[0]?.price.toString() ?? '–',
      rating: d.rating,
      cashbackPct: d.cashbackPercent,
      etaMin: 30,
    })))
    await setSession(phone, { step: 'awaiting_distributor', data: { cep } })
    return
  }

  if (session.step === 'awaiting_distributor' && event.listReply) {
    const distributorId = event.listReply.id
    await sendMessage(phone, `✅ Ótimo! Abrindo o pedido com ${event.listReply.title}. Acesse o app para confirmar e pagar: https://gpago.app/order/${distributorId}`)
    await setSession(phone, { step: 'idle', data: {} })
    return
  }

  await sendMessage(phone, 'Olá! Digite *gás* para pedir seu botijão. 🔥')
}
