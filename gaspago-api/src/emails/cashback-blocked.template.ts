import { baseLayout, sendEmail } from '../shared/email.service'

export function cashbackBlockedHtml(data: { name: string; frozenFgol: string; expiresAt: string }) {
  return baseLayout({
    title: 'Você tem bônus bloqueado 🔒',
    preview: `${data.frozenFgol} FGOL aguardando — faça uma compra para liberar.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Notamos que você não fez compras este mês.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(242,184,37,.1);border:2px solid rgba(242,184,37,.4);border-radius:10px;padding:20px;margin:20px 0;text-align:center">
        <tr><td>
          <p style="margin:0;font-size:13px;font-weight:700;color:#8A6800;text-transform:uppercase;letter-spacing:.08em">Bônus bloqueado</p>
          <p style="margin:8px 0 0;font-size:32px;font-weight:900;color:#8A6800">${data.frozenFgol} FGOL</p>
          <p style="margin:6px 0 0;font-size:12px;color:#5A6A80">Expira em: <strong>${data.expiresAt}</strong></p>
        </td></tr>
      </table>
      <p style="color:#5A6A80;font-size:14px;line-height:1.7">
        Para liberar seu bônus, basta fazer qualquer compra em um estabelecimento parceiro — gás, farmácia, mercado ou restaurante.
        <strong>Simples assim.</strong>
      </p>`,
    ctaText: 'Fazer uma compra agora',
    ctaUrl: 'https://gaspago.app',
  })
}

export const sendCashbackBlocked = (to: string, data: Parameters<typeof cashbackBlockedHtml>[0]) =>
  sendEmail(to, '🔒 Você tem bônus bloqueado — consuma para liberar', cashbackBlockedHtml(data))
