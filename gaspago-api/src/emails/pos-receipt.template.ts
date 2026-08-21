import { baseLayout, sendEmail } from '../shared/email.service'

export function posReceiptHtml(data: {
  name: string; establishment: string; total: string
  fgolUsed: string; pixPaid: string; cashbackFgol: string; date: string
}) {
  return baseLayout({
    title: 'Comprovante de pagamento',
    preview: `Pagamento de R$ ${data.total} em ${data.establishment} confirmado.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Seu pagamento foi confirmado.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #DDD8D0;border-radius:10px;overflow:hidden;margin:20px 0">
        <tr style="background:#F6F3EE"><td style="padding:12px 18px;font-size:13px;color:#5A6A80;border-bottom:1px solid #DDD8D0">Estabelecimento</td><td style="padding:12px 18px;font-size:13px;font-weight:700;color:#1A2840;border-bottom:1px solid #DDD8D0;text-align:right">${data.establishment}</td></tr>
        <tr><td style="padding:12px 18px;font-size:13px;color:#5A6A80;border-bottom:1px solid #DDD8D0">Data</td><td style="padding:12px 18px;font-size:13px;color:#1A2840;border-bottom:1px solid #DDD8D0;text-align:right">${data.date}</td></tr>
        <tr style="background:#F6F3EE"><td style="padding:12px 18px;font-size:13px;color:#5A6A80;border-bottom:1px solid #DDD8D0">Pago com FGOL</td><td style="padding:12px 18px;font-size:13px;color:#F2B825;font-weight:700;border-bottom:1px solid #DDD8D0;text-align:right">${data.fgolUsed} FGOL</td></tr>
        <tr><td style="padding:12px 18px;font-size:13px;color:#5A6A80;border-bottom:1px solid #DDD8D0">Pago via PIX</td><td style="padding:12px 18px;font-size:13px;color:#1A2840;border-bottom:1px solid #DDD8D0;text-align:right">R$ ${data.pixPaid}</td></tr>
        <tr style="background:#F6F3EE"><td style="padding:14px 18px;font-size:16px;font-weight:800;color:#0F2040">Total</td><td style="padding:14px 18px;font-size:16px;font-weight:800;color:#0F2040;text-align:right">R$ ${data.total}</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(242,184,37,.1);border:1px solid rgba(242,184,37,.4);border-radius:9px;padding:14px 18px">
        <tr><td>
          <p style="margin:0;font-size:12px;font-weight:700;color:#8A6800;text-transform:uppercase;letter-spacing:.08em">Cashback creditado</p>
          <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#8A6800">${data.cashbackFgol} FGOL</p>
        </td></tr>
      </table>`,
    ctaText: 'Ver minha carteira',
    ctaUrl: 'https://gaspago.app/wallet',
  })
}

export const sendPosReceipt = (to: string, data: Parameters<typeof posReceiptHtml>[0]) =>
  sendEmail(to, `Comprovante — ${data.establishment} R$ ${data.total}`, posReceiptHtml(data))
