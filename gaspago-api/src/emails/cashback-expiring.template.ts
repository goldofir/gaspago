import { baseLayout, sendEmail } from '../shared/email.service'

export function cashbackExpiringHtml(data: { name: string; frozenFgol: string; daysLeft: number; expiresAt: string }) {
  return baseLayout({
    title: `⏰ Seus bônus vencem em ${data.daysLeft} dias`,
    preview: `${data.frozenFgol} FGOL serão perdidos em ${data.daysLeft} dias se você não consumir.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Seu tempo está acabando.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(229,62,62,.07);border:2px solid rgba(229,62,62,.3);border-radius:10px;padding:20px;margin:20px 0;text-align:center">
        <tr><td>
          <p style="margin:0;font-size:13px;font-weight:700;color:#C53030;text-transform:uppercase;letter-spacing:.08em">Expira em ${data.daysLeft} dias (${data.expiresAt})</p>
          <p style="margin:8px 0 0;font-size:32px;font-weight:900;color:#C53030">${data.frozenFgol} FGOL</p>
          <p style="margin:6px 0 0;font-size:12px;color:#5A6A80">Estes bônus serão cancelados se não houver consumo</p>
        </td></tr>
      </table>
      <p style="color:#5A6A80;font-size:14px;line-height:1.7">
        Não perca. Qualquer compra — mesmo pequena — em qualquer estabelecimento parceiro já é suficiente para manter seus bônus ativos.
      </p>`,
    ctaText: 'Salvar meus bônus agora',
    ctaUrl: 'https://gaspago.app',
  })
}

export const sendCashbackExpiring = (to: string, data: Parameters<typeof cashbackExpiringHtml>[0]) =>
  sendEmail(to, `⏰ Seus ${data.frozenFgol} FGOL vencem em ${data.daysLeft} dias`, cashbackExpiringHtml(data))
