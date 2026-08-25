import Redis from 'ioredis'
import { prisma } from '../shared/prisma'
import { sendText, sendList, sendLocation } from './client'
import { findDistributorsByPostalCode, findDistributorsByLocation } from '../orders/routing.service'
import { resolveOrCreateWaUser } from './wa-user.service'
import { createOrder, OrderCreationError } from '../orders/order.service'
import type { WAEvent } from './webhook.routes'

// Conversation state per phone number — was an in-memory Map (lost on every
// restart, never shared across instances). Redis matches the pattern already
// used for OTP sessions (see auth/otp.service.ts) and survives restarts/scaling.
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379')
const SESSION_PREFIX = 'wa:session:'
const SESSION_TTL_SECONDS = 30 * 60 // conversation goes stale after 30min idle

type SessionData = {
  lat?: number
  lng?: number
  cep?: string
  distributorId?: string
  distributorName?: string
  productId?: string
  productName?: string
  productPrice?: number
  quantity?: number
  address?: string
}

interface WaSession {
  step: string
  data: SessionData
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

async function resetToIdle(phone: string) {
  await redis.del(SESSION_PREFIX + phone)
}

const CANCEL_WORDS = ['cancelar', 'cancela', 'parar', 'sair']

export async function handleIncomingMessage(event: WAEvent) {
  // Delivery-receipt events report on a message WE sent earlier — correlate
  // back via the provider's own message id (captured on send, see client.ts)
  // and record it, instead of silently dropping the event like before.
  if (event.type === 'status') {
    if (event.status) {
      await prisma.waMessage.updateMany({ where: { providerId: event.messageId }, data: { status: event.status } }).catch(() => {})
    }
    return
  }

  const phone = event.from
  const inboundText = event.listReply
    ? `[selecionou] ${event.listReply.title}`
    : event.location
      ? `📍 [localização compartilhada]`
      : (event.text ?? '')
  await prisma.waMessage.create({ data: { phone, direction: 'INBOUND', text: inboundText } }).catch(() => {})

  const session = await getSession(phone)
  const textLower = event.text?.toLowerCase().trim()

  // Global cancel — works from any step, not just the ones that expect free text.
  if (session.step !== 'idle' && textLower && CANCEL_WORDS.includes(textLower)) {
    await resetToIdle(phone)
    await sendText(phone, 'Pedido cancelado. Digite *gás* quando quiser recomeçar. 🔥')
    return
  }

  if (session.step === 'idle' || textLower?.includes('gas') || textLower?.includes('gás')) {
    await sendText(phone, '📍 Me manda sua localização (clipe → Localização) ou digite seu CEP pra eu achar distribuidoras perto de você.')
    await setSession(phone, { step: 'awaiting_location', data: {} })
    return
  }

  if (session.step === 'awaiting_location') {
    let distributors: Awaited<ReturnType<typeof findDistributorsByPostalCode>>
    let locationData: SessionData

    if (event.location) {
      distributors = await findDistributorsByLocation(event.location.lat, event.location.lng)
      locationData = { lat: event.location.lat, lng: event.location.lng }
    } else {
      const cep = event.text?.replace(/\D/g, '')
      if (!cep || cep.length !== 8) {
        await sendText(phone, '❌ CEP inválido. Digite os 8 dígitos (ex: 01310100) ou compartilhe sua localização.')
        return
      }
      distributors = await findDistributorsByPostalCode(cep)
      locationData = { cep }
    }

    if (!distributors.length) {
      await sendText(phone, '😔 Ainda não temos distribuidoras na sua região. Em breve chegaremos aí!')
      await resetToIdle(phone)
      return
    }

    await sendList(
      phone,
      'Escolha a distribuidora na sua região:',
      distributors.map(d => ({
        id: d.id,
        title: `${d.name} — a partir de R$ ${(d.products[0]?.price ?? 0).toString()}`,
        description: `★ ${d.rating.toFixed(1)} · ${(d.cashbackPercent * 100).toFixed(0)}% cashback`,
      })),
    )
    await setSession(phone, { step: 'awaiting_distributor', data: locationData })
    return
  }

  if (session.step === 'awaiting_distributor') {
    if (!event.listReply) {
      await sendText(phone, 'Toca numa das distribuidoras da lista acima pra continuar (ou digite *cancelar*).')
      return
    }
    const distributor = await prisma.distributor.findUnique({ where: { id: event.listReply.id } })
    if (!distributor) {
      await sendText(phone, 'Essa distribuidora não está mais disponível. Digite *gás* pra tentar de novo.')
      await resetToIdle(phone)
      return
    }
    const products = await prisma.product.findMany({
      where: { distributorId: distributor.id, isAvailable: true },
      orderBy: { price: 'asc' },
    })
    if (!products.length) {
      await sendText(phone, '😔 Essa distribuidora não tem produtos disponíveis agora. Escolha outra ou digite *gás* pra ver a lista de novo.')
      return
    }

    if (distributor.lat && distributor.lng) {
      await sendLocation(phone, distributor.lat, distributor.lng, distributor.name, distributor.address)
    }

    await sendList(
      phone,
      `O que você quer pedir na ${distributor.name}?`,
      products.map(p => ({ id: p.id, title: `${p.name} — R$ ${Number(p.price).toFixed(2)}`, description: p.description ?? undefined })),
    )
    await setSession(phone, {
      step: 'awaiting_product',
      data: { ...session.data, distributorId: distributor.id, distributorName: distributor.name },
    })
    return
  }

  if (session.step === 'awaiting_product') {
    if (!event.listReply) {
      await sendText(phone, 'Toca num dos produtos da lista acima pra continuar (ou digite *cancelar*).')
      return
    }
    const product = await prisma.product.findUnique({ where: { id: event.listReply.id } })
    if (!product) {
      await sendText(phone, 'Esse produto não está mais disponível. Digite *gás* pra tentar de novo.')
      await resetToIdle(phone)
      return
    }
    await sendText(phone, `Quantos *${product.name}* você quer? Digite um número (1 a 10).`)
    await setSession(phone, {
      step: 'awaiting_quantity',
      data: { ...session.data, productId: product.id, productName: product.name, productPrice: Number(product.price) },
    })
    return
  }

  if (session.step === 'awaiting_quantity') {
    const qty = Number(event.text?.replace(/\D/g, ''))
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      await sendText(phone, '❌ Digite um número de 1 a 10.')
      return
    }
    await sendText(phone, '📬 Agora me manda o endereço completo de entrega (rua, número, bairro).')
    await setSession(phone, { step: 'awaiting_address', data: { ...session.data, quantity: qty } })
    return
  }

  if (session.step === 'awaiting_address') {
    const address = event.text?.trim()
    if (!address || address.length < 8) {
      await sendText(phone, '❌ Manda o endereço completo (rua, número, bairro) pra eu conseguir entregar.')
      return
    }

    const user = await resolveOrCreateWaUser(phone)
    const nextData = { ...session.data, address }

    if (!user.cpf) {
      await sendText(phone, '🪪 Última coisa: qual seu CPF? (só números, precisamos pra emitir a cobrança PIX)')
      await setSession(phone, { step: 'awaiting_cpf', data: nextData })
      return
    }

    await sendOrderSummary(phone, nextData)
    await setSession(phone, { step: 'awaiting_confirmation', data: nextData })
    return
  }

  if (session.step === 'awaiting_cpf') {
    const cpf = event.text?.replace(/\D/g, '')
    if (!cpf || cpf.length !== 11) {
      await sendText(phone, '❌ CPF inválido. Digite os 11 números, sem pontos ou traço.')
      return
    }
    const user = await resolveOrCreateWaUser(phone)
    await prisma.user.update({ where: { id: user.id }, data: { cpf } }).catch(async () => {
      // Unique-constraint clash (cpf already on another account) — ask again
      // instead of silently failing the order later at the Asaas call.
      await sendText(phone, '❌ Esse CPF já está em outra conta. Digite outro CPF.')
    })
    await sendOrderSummary(phone, session.data)
    await setSession(phone, { step: 'awaiting_confirmation', data: session.data })
    return
  }

  if (session.step === 'awaiting_confirmation') {
    if (event.listReply?.id === 'confirm') {
      await placeOrderAndReply(phone, session.data)
      await resetToIdle(phone)
      return
    }
    if (event.listReply?.id === 'cancel') {
      await resetToIdle(phone)
      await sendText(phone, 'Pedido cancelado. Digite *gás* quando quiser recomeçar. 🔥')
      return
    }
    await sendText(phone, 'Toca em *Confirmar pedido* ou *Cancelar* na lista acima.')
    return
  }

  await sendText(phone, 'Olá! Digite *gás* para pedir seu botijão. 🔥')
}

async function sendOrderSummary(phone: string, data: SessionData) {
  const total = (data.productPrice ?? 0) * (data.quantity ?? 1)
  const summary = [
    `*Confira seu pedido:*`,
    `${data.quantity}x ${data.productName}`,
    `Distribuidora: ${data.distributorName}`,
    `Endereço: ${data.address}`,
    `Total: R$ ${total.toFixed(2)}`,
  ].join('\n')
  await sendText(phone, summary)
  await sendList(phone, 'Tudo certo?', [
    { id: 'confirm', title: '✅ Confirmar pedido' },
    { id: 'cancel', title: '❌ Cancelar' },
  ])
}

async function placeOrderAndReply(phone: string, data: SessionData) {
  if (!data.distributorId || !data.productId || !data.quantity || !data.address) {
    await sendText(phone, '❌ Faltou alguma informação do pedido. Digite *gás* pra começar de novo.')
    return
  }
  const user = await resolveOrCreateWaUser(phone)

  try {
    const { order, pixPayload } = await createOrder({
      customerId: user.id,
      distributorId: data.distributorId,
      items: [{ productId: data.productId, quantity: data.quantity }],
      deliveryAddress: data.address,
      deliveryPostalCode: data.cep ?? '',
      paymentMethod: 'PIX',
      channel: 'whatsapp',
      cpf: user.cpf ?? undefined,
    })

    if (pixPayload) {
      await sendText(
        phone,
        `✅ Pedido criado! Pague via PIX copia e cola pra confirmar:\n\n${pixPayload}\n\nAssim que o pagamento cair, sua distribuidora já recebe o pedido.`,
      )
    } else {
      await sendText(phone, `✅ Pedido criado e pago com seu saldo FGOL! Sua distribuidora já recebeu o pedido.`)
    }
    await sendText(phone, `Acompanhe pelo app: https://gpago.app/order/${order.id}`)
  } catch (err: any) {
    const message = err instanceof OrderCreationError ? err.message : 'Não foi possível criar seu pedido agora. Tente de novo em instantes.'
    await sendText(phone, `❌ ${message}`)
  }
}
