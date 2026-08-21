import { baseLayout, sendEmail } from '../shared/email.service'

export function passwordResetHtml(data: { name: string; otp: string; expiresMinutes: number }) {
  return baseLayout({
    title: 'Código de acesso',
    preview: `Seu código: ${data.otp} — válido por ${data.expiresMinutes} minutos.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Aqui está seu código de acesso.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;text-align:center">
        <tr><td style="background:#0F2040;border-radius:10px;padding:24px">
          <p style="margin:0;font-size:11px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:.15em;text-transform:uppercase">Código</p>
          <p style="margin:10px 0 0;font-size:42px;font-weight:900;color:#F2B825;letter-spacing:.25em;font-family:'Courier New',monospace">${data.otp}</p>
          <p style="margin:10px 0 0;font-size:12px;color:rgba(255,255,255,.5)">Válido por ${data.expiresMinutes} minutos</p>
        </td></tr>
      </table>
      <p style="color:#8A9BB0;font-size:13px">Se você não solicitou este código, ignore este e-mail. Sua conta continua protegida.</p>`,
  })
}

export const sendPasswordReset = (to: string, data: Parameters<typeof passwordResetHtml>[0]) =>
  sendEmail(to, `${data.otp} é seu código Gás Pago`, passwordResetHtml(data))
