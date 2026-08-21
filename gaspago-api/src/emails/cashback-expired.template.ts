import { baseLayout, sendEmail } from '../shared/email.service'

export function cashbackExpiredHtml(data: { name: string; lostFgol: string }) {
  return baseLayout({
    title: 'Seus bônus expiraram',
    preview: `${data.lostFgol} FGOL foram cancelados por inatividade. Volte a comprar para acumular novamente.`,
    body: `
      <p style="color:#5A6A80;font-size:15px">Olá, <strong>${data.name}</strong>.</p>
      <p style="color:#5A6A80;font-size:15px;line-height:1.7">
        Por dois meses consecutivos sem compras, <strong style="color:#C53030">${data.lostFgol} FGOL</strong> que estavam bloqueados foram cancelados conforme os termos do programa.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;border-radius:10px;padding:18px 22px;margin:20px 0">
        <tr><td>
          <p style="margin:0;font-size:14px;color:#5A6A80;line-height:1.65">
            <strong style="color:#0F2040">Boa notícia:</strong> sua conta continua ativa. Faça qualquer compra agora e comece a acumular bônus novamente do zero.
          </p>
        </td></tr>
      </table>`,
    ctaText: 'Recomeçar a acumular',
    ctaUrl: 'https://gaspago.app',
  })
}

export const sendCashbackExpired = (to: string, data: Parameters<typeof cashbackExpiredHtml>[0]) =>
  sendEmail(to, 'Seus bônus expiraram — veja como recomeçar', cashbackExpiredHtml(data))
