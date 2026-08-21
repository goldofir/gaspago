import { prisma } from '../shared/prisma'
import { sendText as sendMessage, sendDistributorOptions } from './client'
import { findDistributorsByPostalCode } from '../orders/routing.service'
import type { WAEvent } from './webhook.routes'

// Simple state machine stored in Redis or DB per user session
// For now: in-memory map (replace with Redis in production)
const sessions = new Map<string, { step: string; data: Record<string, unknown> }>()

export async function handleIncomingMessage(event: WAEvent) {
  if (event.type !== 'message') return

  const phone = event.from
  const session = sessions.get(phone) ?? { step: 'idle', data: {} }

  if (session.step === 'idle' || event.text?.toLowerCase().includes('gas') || event.text?.toLowerCase().includes('gás')) {
    await sendMessage(phone, '📍 Qual o seu CEP para encontrar distribuidoras na sua região?')
    sessions.set(phone, { step: 'awaiting_cep', data: {} })
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
      sessions.set(phone, { step: 'idle', data: {} })
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
    sessions.set(phone, { step: 'awaiting_distributor', data: { cep } })
    return
  }

  if (session.step === 'awaiting_distributor' && event.listReply) {
    const distributorId = event.listReply.id
    await sendMessage(phone, `✅ Ótimo! Abrindo o pedido com ${event.listReply.title}. Acesse o app para confirmar e pagar: https://gpago.app/order/${distributorId}`)
    sessions.set(phone, { step: 'idle', data: {} })
    return
  }

  await sendMessage(phone, 'Olá! Digite *gás* para pedir seu botijão. 🔥')
}
