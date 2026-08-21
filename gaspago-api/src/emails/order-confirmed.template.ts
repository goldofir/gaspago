import { baseLayout, sendEmail } from '../shared/email.service'

export function orderConfirmedHtml(data: {
  name: string; orderId: string; distributorName: string
  items: { name: string; qty: number; price: string }[]
  total: string; estimatedMinutes: number; cashbackFgol: string
}) {
  const itemRows = data.items.map(i =>
    `<tr>
      <td style="padding:8px 0;color:#1A2840;font-size:14px;border-bottom:1px solid #EDE9E2">${i.name} × ${i.qty}</td>
      <td style="padding:8px 0;color:#1A2840;font-size:14px;border-bottom:1px solid #EDE9E2;text-align:right">R$ ${i.price}</td>
    </tr>`
  ).join('')

  return baseLayout({
    title: 'Pedido confirmado!',
    preview: `Seu pedido #${data.orderId.slice(-6).toUpperCase()} foi recebido por ${data.distributorName}.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Seu pedido está confirmado e será entregue em aproximadamente <strong>${data.estimatedMinutes} minutos</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
        ${itemRows}
        <tr>
          <td style="padding:12px 0 0;font-size:16px;font-weight:800;color:#0F2040">Total</td>
          <td style="padding:12px 0 0;font-size:16px;font-weight:800;color:#0F2040;text-align:right">R$ ${data.total}</td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(242,184,37,.1);border:1px solid rgba(242,184,37,.4);border-radius:9px;padding:14px 18px;margin-top:16px">
        <tr><td>
          <p style="margin:0;font-size:12px;font-weight:700;color:#8A6800;text-transform:uppercase;letter-spacing:.08em">Cashback a receber após entrega</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#8A6800">${data.cashbackFgol} FGOL</p>
        </td></tr>
      </table>`,
    ctaText: 'Acompanhar pedido',
    ctaUrl: `https://gaspago.app/orders/${data.orderId}`,
  })
}

export const sendOrderConfirmed = (to: string, data: Parameters<typeof orderConfirmedHtml>[0]) =>
  sendEmail(to, `Pedido #${data.orderId.slice(-6).toUpperCase()} confirmado ✅`, orderConfirmedHtml(data))
