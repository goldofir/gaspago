import { baseLayout, sendEmail } from '../shared/email.service'

export function welcomeHtml(data: { name: string; referralCode: string; referralUrl: string }) {
  return baseLayout({
    title: `Bem-vindo ao Gás Pago, ${data.name}!`,
    preview: 'Seu cadastro foi confirmado. Comece a ganhar FGOL em cada compra.',
    body: `
      <p style="color:#5A6A80;font-size:15px;line-height:1.7">
        Sua conta está ativa. A partir de agora, cada compra de gás ou qualquer produto de
        estabelecimento parceiro gera <strong style="color:#FF6524">cashback em FGOL</strong> direto na sua carteira.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;border-radius:10px;padding:18px 22px;margin:20px 0">
        <tr><td>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#8A9BB0;letter-spacing:.08em;text-transform:uppercase">Seu código de indicação</p>
          <p style="margin:0;font-size:22px;font-weight:900;color:#0F2040;letter-spacing:.15em;font-family:'Courier New',monospace">${data.referralCode}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#5A6A80">Indique 5 amigos e desbloqueie bônus acumulados</p>
        </td></tr>
      </table>
      <p style="color:#5A6A80;font-size:14px">Compartilhe seu link:<br>
        <a href="${data.referralUrl}" style="color:#FF6524;word-break:break-all">${data.referralUrl}</a>
      </p>`,
    ctaText: 'Fazer meu primeiro pedido',
    ctaUrl: 'https://gaspago.app',
  })
}

export const sendWelcome = (to: string, data: Parameters<typeof welcomeHtml>[0]) =>
  sendEmail(to, 'Bem-vindo ao Gás Pago! ⛽', welcomeHtml(data))
