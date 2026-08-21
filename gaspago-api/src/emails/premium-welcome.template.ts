import { baseLayout, sendEmail } from '../shared/email.service'

export function premiumWelcomeHtml(data: { name: string; expiresAt: string }) {
  const benefits = [
    '✅ Seguro de acidentes pessoais',
    '✅ Assistência veicular 24h',
    '✅ Telemedicina ilimitada',
    '✅ Cashback ampliado em parceiros Premium',
    '✅ Suporte prioritário',
  ]
  return baseLayout({
    title: 'Bem-vindo ao Premium! 🌟',
    preview: 'Seu plano Premium está ativo. Aproveite todos os benefícios.',
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Seu plano Premium está ativo até <strong>${data.expiresAt}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0F2040,#1B3460);border-radius:12px;padding:24px;margin:20px 0">
        <tr><td>
          <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.1em">Seus benefícios</p>
          ${benefits.map(b => `<p style="margin:0 0 10px;font-size:14px;color:#fff;line-height:1.5">${b}</p>`).join('')}
        </td></tr>
      </table>`,
    ctaText: 'Ver todos os benefícios',
    ctaUrl: 'https://gaspago.app/premium',
  })
}

export const sendPremiumWelcome = (to: string, data: Parameters<typeof premiumWelcomeHtml>[0]) =>
  sendEmail(to, '🌟 Plano Premium ativado!', premiumWelcomeHtml(data))
