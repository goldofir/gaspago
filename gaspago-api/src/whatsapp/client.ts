import axios from 'axios'
import { SystemConfigService } from '../shared/system-config.service'

const CONEXBOT_BASE = 'https://app.conext.click/api/v1'

function wa() {
  return axios.create({
    baseURL: CONEXBOT_BASE,
    headers: { Authorization: `Bearer ${SystemConfigService.getOrThrow('CONEXBOT_API_KEY')}` },
  })
}

export async function sendText(to: string, body: string) {
  await wa().post('/messages', {
    to,
    type: 'text',
    text: { body },
  })
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
