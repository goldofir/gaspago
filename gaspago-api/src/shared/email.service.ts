import nodemailer from 'nodemailer'
import { SystemConfigService } from './system-config.service'

function getTransporter() {
  return nodemailer.createTransport({
    host: SystemConfigService.getOrThrow('SMTP_HOST'),
    port: Number(SystemConfigService.get('SMTP_PORT') ?? 587),
    secure: Number(SystemConfigService.get('SMTP_PORT') ?? 587) === 465,
    auth: {
      user: SystemConfigService.getOrThrow('SMTP_USER'),
      pass: SystemConfigService.getOrThrow('SMTP_PASS'),
    },
  })
}

export async function sendEmail(to: string, subject: string, html: string) {
  const from = `${SystemConfigService.get('SMTP_FROM_NAME') ?? 'Gás Pago'} <${SystemConfigService.getOrThrow('SMTP_FROM_EMAIL')}>`
  await getTransporter().sendMail({ from, to, subject, html })
}

export async function testSmtp(to: string) {
  await sendEmail(to, 'Teste de e-mail — Gás Pago', baseLayout({
    title: 'Conexão SMTP funcionando!',
    preview: 'Seu servidor de e-mail está configurado corretamente.',
    body: `<p style="font-size:16px;color:#1A2840">O servidor SMTP do <strong>Gás Pago</strong> está funcionando corretamente.</p>
           <p style="color:#5A6A80">Todas as credenciais foram validadas com sucesso.</p>`,
  }))
}

// Base layout shared by all templates
export function baseLayout({ title, preview, body, ctaText, ctaUrl }: {
  title: string; preview: string; body: string; ctaText?: string; ctaUrl?: string
}) {
  const cta = ctaText && ctaUrl ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
      <tr><td align="center">
        <a href="${ctaUrl}" style="display:inline-block;background:#FF6524;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">${ctaText}</a>
      </td></tr>
    </table>` : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="x-apple-message-grouping" content="1">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#F6F3EE;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

      <!-- Header -->
      <tr><td style="background:#0F2040;border-radius:12px 12px 0 0;padding:28px 40px;text-align:center">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px">
            <span style="color:#FF6524">⛽</span> Gás <span style="color:#F2B825">Pago</span>
          </td>
        </tr></table>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#fff;padding:36px 40px;border-left:1px solid #DDD8D0;border-right:1px solid #DDD8D0">
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0F2040;line-height:1.2">${title}</h1>
        ${body}
        ${cta}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#EDE9E2;border-radius:0 0 12px 12px;border:1px solid #DDD8D0;border-top:none;padding:20px 40px;text-align:center">
        <p style="margin:0 0 6px;font-size:12px;color:#8A9BB0">Gás Pago · Goldofir · CNPJ em cadastro</p>
        <p style="margin:0;font-size:11px;color:#8A9BB0">
          <a href="https://gaspago.app/unsubscribe" style="color:#8A9BB0">Cancelar e-mails</a>
          &nbsp;·&nbsp;
          <a href="https://gaspago.app/privacy" style="color:#8A9BB0">Privacidade</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}
