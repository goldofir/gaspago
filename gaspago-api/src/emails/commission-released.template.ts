import { baseLayout, sendEmail } from '../shared/email.service'

export function commissionReleasedHtml(data: { name: string; releasedFgol: string }) {
  return baseLayout({
    title: '🎉 Seus bônus foram liberados!',
    preview: `${data.releasedFgol} FGOL desbloqueados e disponíveis na sua carteira.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Você voltou a comprar e seus bônus foram liberados.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(72,187,120,.08);border:2px solid rgba(72,187,120,.35);border-radius:10px;padding:20px;margin:20px 0;text-align:center">
        <tr><td>
          <p style="margin:0;font-size:13px;font-weight:700;color:#276749;text-transform:uppercase;letter-spacing:.08em">Liberado agora</p>
          <p style="margin:8px 0 0;font-size:32px;font-weight:900;color:#276749">${data.releasedFgol} FGOL</p>
        </td></tr>
      </table>
      <p style="color:#5A6A80;font-size:14px">Use como desconto na próxima compra ou converta para PIX quando quiser.</p>`,
    ctaText: 'Ver minha carteira',
    ctaUrl: 'https://gaspago.app/wallet',
  })
}

export const sendCommissionReleased = (to: string, data: Parameters<typeof commissionReleasedHtml>[0]) =>
  sendEmail(to, '🎉 Bônus liberados na sua carteira!', commissionReleasedHtml(data))
