import axios from 'axios'
import { SystemConfigService } from '../shared/system-config.service'
import { prisma } from '../shared/prisma'

const CONEXBOT_BASE = 'https://app.conext.click/api/v1'

function wa() {
  return axios.create({
    baseURL: CONEXBOT_BASE,
    headers: { Authorization: `Bearer ${SystemConfigService.getOrThrow('CONEXBOT_API_KEY')}` },
  })
}

// Persists a copy of every outbound message — previously nothing was ever
// saved, so there was no conversation history anywhere for support/CRM to
// look back on. Logging failure never blocks the actual send.
async function logOutbound(phone: string, text: string) {
  await prisma.waMessage.create({ data: { phone, direction: 'OUTBOUND', text } }).catch(() => {})
}

export async function sendText(to: string, body: string) {
  await wa().post('/messages', {
    to,
    type: 'text',
    text: { body },
  })
  await logOutbound(to, body)
}

export async function sendList(
  to: string,
  body: string,
  items: { id: string; title: string; description?: string }[]
) {
  await wa().post('/messages', {
    to,
    type: 'list',
    body,
    sections: [{ title: 'Opções', rows: items }],
  })
  const summary = `${body}\n${items.map(i => `• ${i.title}`).join('\n')}`
  await logOutbound(to, summary)
}

export async function sendDistributorOptions(
  to: string,
  distributors: {
    id: string; name: string; price: string; rating: number; cashbackPct: number; etaMin: number
  }[]
) {
  const items = distributors.map(d => ({
    id: d.id,
    title: `${d.name} — R$ ${d.price}`,
    description: `★ ${d.rating.toFixed(1)} · ${d.etaMin} min · ${(d.cashbackPct * 100).toFixed(0)}% cashback`,
  }))
  await sendList(to, 'Escolha a distribuidora na sua região:', items)
}
