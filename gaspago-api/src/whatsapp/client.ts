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
// look back on. Logging failure never blocks the actual send. providerId
// (Conexbot's own id for the message, ASSUMED to be `res.data.id` — not
// confirmed against real Conexbot API docs, just the common REST
// convention) is what a later "status" webhook event correlates back to;
// if Conexbot's field is actually named differently this just stays null
// and status updates silently no-op, nothing breaks.
async function logOutbound(phone: string, text: string, providerId?: string) {
  await prisma.waMessage.create({ data: { phone, direction: 'OUTBOUND', text, providerId, status: providerId ? 'sent' : undefined } }).catch(() => {})
}

// A failed send (bad number, Conexbot outage, rate limit) must not crash the
// bot's own conversation processing — the DB writes and session-state
// transitions the caller does around a send are the actual source of truth
// for where the customer is in the flow. Logged loudly (so a real outage is
// still visible in server logs) but never thrown.
async function safeSend(to: string, payload: Record<string, unknown>, fallbackLogText: string): Promise<void> {
  try {
    const res = await wa().post('/messages', payload)
    await logOutbound(to, fallbackLogText, res.data?.id)
  } catch (err: any) {
    console.error('[whatsapp] send failed', { to, type: payload.type, err: err?.response?.data ?? err?.message })
    await logOutbound(to, fallbackLogText)
  }
}

export async function sendText(to: string, body: string) {
  await safeSend(to, { to, type: 'text', text: { body } }, body)
}

export async function sendList(
  to: string,
  body: string,
  items: { id: string; title: string; description?: string }[]
) {
  const summary = `${body}\n${items.map(i => `• ${i.title}`).join('\n')}`
  await safeSend(to, { to, type: 'list', body, sections: [{ title: 'Opções', rows: items }] }, summary)
}

// Sends a native WhatsApp location pin — used to show a distributor's spot
// on the map once the customer picks one, complementing the text address.
export async function sendLocation(
  to: string,
  lat: number,
  lng: number,
  name?: string,
  address?: string,
) {
  const label = `📍 ${name ?? 'Localização'}${address ? ` — ${address}` : ''}`
  await safeSend(to, { to, type: 'location', location: { latitude: lat, longitude: lng, name, address } }, label)
}
