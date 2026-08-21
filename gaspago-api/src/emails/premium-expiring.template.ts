import { baseLayout, sendEmail } from '../shared/email.service'

export function premiumExpiringHtml(data: { name: string; daysLeft: number; renewUrl: string }) {
  return baseLayout({
    title: `Seu Premium vence em ${data.daysLeft} dias`,
    preview: `Renove para continuar com seguro, assistência e telemedicina.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>! Seu plano Premium vence em <strong>${data.daysLeft} dias</strong>.</p>
      <p style="color:#5A6A80;font-size:15px;line-height:1.7">Ao renovar, você mantém acesso a seguro de acidentes, assistência veicular 24h, telemedicina e cashback ampliado nos parceiros Premium.</p>
      <p style="color:#5A6A80;font-size:14px">Se não renovar, sua conta continua ativa no plano Free com cashback básico.</p>`,
    ctaText: 'Renovar meu Premium',
    ctaUrl: data.renewUrl,
  })
}

export const sendPremiumExpiring = (to: string, data: Parameters<typeof premiumExpiringHtml>[0]) =>
  sendEmail(to, `Seu Premium vence em ${data.daysLeft} dias — renove agora`, premiumExpiringHtml(data))
