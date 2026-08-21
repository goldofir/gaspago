import { baseLayout, sendEmail } from '../shared/email.service'

export function orderDeliveredHtml(data: {
  name: string; orderId: string; cashbackFgol: string; rateUrl: string
}) {
  return baseLayout({
    title: 'Entregue! Seu cashback chegou 🎉',
    preview: `${data.cashbackFgol} FGOL foram creditados na sua carteira.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Seu pedido foi entregue com sucesso.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(72,187,120,.08);border:2px solid rgba(72,187,120,.35);border-radius:10px;padding:20px;margin:20px 0;text-align:center">
        <tr><td>
          <p style="margin:0;font-size:13px;font-weight:700;color:#276749;text-transform:uppercase;letter-spacing:.08em">Creditado na sua carteira</p>
          <p style="margin:8px 0 0;font-size:32px;font-weight:900;color:#276749">${data.cashbackFgol} FGOL</p>
          <p style="margin:6px 0 0;font-size:12px;color:#5A6A80">Disponível para usar como desconto ou trocar</p>
        </td></tr>
      </table>
      <p style="color:#5A6A80;font-size:14px">Gostou do serviço? Avalie a entrega e ajude outros usuários a escolher bem.</p>`,
    ctaText: 'Avaliar entrega ⭐',
    ctaUrl: data.rateUrl,
  })
}

export const sendOrderDelivered = (to: string, data: Parameters<typeof orderDeliveredHtml>[0]) =>
  sendEmail(to, 'Entregue! Seu cashback chegou 🎉', orderDeliveredHtml(data))
