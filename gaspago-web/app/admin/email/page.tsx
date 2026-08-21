'use client'
import { useState } from 'react'
import { Send, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

const TEMPLATES = [
  { id: 'welcome',             label: 'Boas-vindas',          desc: 'Enviado ao criar conta — contém o código de indicação' },
  { id: 'order-confirmed',     label: 'Pedido confirmado',    desc: 'Resumo do pedido com detalhes e previsão de entrega' },
  { id: 'order-delivered',     label: 'Pedido entregue',      desc: 'FGOL creditado — CTA para avaliar o estabelecimento' },
  { id: 'cashback-blocked',    label: 'Bônus bloqueado',      desc: '1 mês sem consumo — saldo congelado com data de expiração' },
  { id: 'cashback-expiring',   label: 'Bônus expirando',      desc: 'Alerta de contagem regressiva antes da perda' },
  { id: 'cashback-expired',    label: 'Bônus expirado',       desc: 'Notificação de comissões transferidas à empresa' },
  { id: 'commission-released', label: 'Bônus liberado',       desc: 'Saldo desbloqueado ao retomar consumo' },
  { id: 'pos-receipt',         label: 'Recibo POS',           desc: 'Comprovante de pagamento em estabelecimento físico' },
  { id: 'password-reset',      label: 'Código de acesso OTP', desc: 'Login e redefinição de senha' },
  { id: 'premium-welcome',     label: 'Bem-vindo Premium',    desc: 'Ativação do plano com lista de benefícios' },
  { id: 'premium-expiring',    label: 'Premium expirando',    desc: 'CTA de renovação antes do vencimento' },
]

export default function EmailPage() {
  const [testTo, setTestTo] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null)

  const sendTest = async () => {
    if (!testTo) return
    setSending(true); setResult(null)
    try {
      const res = await fetch(`${API}/admin/email/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo }),
      })
      setResult(res.ok ? { ok: true } : { error: 'Falha no envio — verifique as credenciais SMTP' })
    } catch { setResult({ error: 'Erro de conexão com a API' }) }
    setSending(false)
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <style>{`
        .email-input:focus { outline: none; border-color: var(--flame) !important; box-shadow: 0 0 0 3px var(--flame-dim); }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Comunicação
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
          E-mail
        </h1>
        <p style={{ color: 'var(--sub)', marginTop: 8, fontSize: 14 }}>
          Configure o servidor em{' '}
          <Link href="/admin/credentials" style={{ color: 'var(--flame)', fontWeight: 500 }}>
            Credenciais → E-mail SMTP
          </Link>
          . Todos os templates usam o layout de marca Gás Pago.
        </p>
      </div>

      {/* SMTP test card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '22px 24px', marginBottom: 20, boxShadow: 'var(--shadow)',
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Testar conexão SMTP</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Envia um e-mail de teste para verificar se as credenciais estão corretas.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="email-input"
            type="email" placeholder="email@exemplo.com"
            value={testTo} onChange={e => setTestTo(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendTest()}
            style={{
              flex: 1, padding: '9px 14px', border: '1px solid var(--border)',
              borderRadius: 9, fontSize: 13, background: 'var(--surface)', color: 'var(--text)',
            }}
          />
          <button
            onClick={sendTest} disabled={sending || !testTo}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', background: testTo && !sending ? 'var(--flame)' : 'var(--surface-2)',
              color: testTo && !sending ? '#fff' : 'var(--muted)',
              border: `1px solid ${testTo && !sending ? 'transparent' : 'var(--border)'}`,
              borderRadius: 9, fontSize: 13, fontWeight: 600, transition: 'all .15s',
              cursor: testTo && !sending ? 'pointer' : 'default',
            }}
          >
            <Send size={13} />
            {sending ? 'Enviando…' : 'Enviar teste'}
          </button>
        </div>
        {result && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
            padding: '10px 14px', borderRadius: 8,
            background: result.ok ? 'var(--green-dim)' : 'var(--red-dim)',
            border: `1px solid ${result.ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
          }}>
            {result.ok
              ? <CheckCircle2 size={14} color="var(--green)" />
              : <XCircle size={14} color="var(--red)" />
            }
            <span style={{ fontSize: 13, color: result.ok ? '#166534' : '#991B1B', fontWeight: 500 }}>
              {result.ok ? 'E-mail enviado com sucesso!' : result.error}
            </span>
          </div>
        )}
      </div>

      {/* Templates */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Templates transacionais</span>
            <span style={{
              marginLeft: 8, padding: '2px 8px', borderRadius: 20,
              background: 'var(--flame-dim)', color: 'var(--flame)',
              fontSize: 11, fontWeight: 600,
            }}>
              {TEMPLATES.length}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Layout Gás Pago · HTML inline</span>
        </div>

        {TEMPLATES.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 20px',
            borderBottom: i < TEMPLATES.length - 1 ? '1px solid var(--border-lt)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{t.desc}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
              <code style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5,
                color: 'var(--muted)', background: 'var(--surface-2)',
                padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border-lt)',
              }}>
                {t.id}
              </code>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 2px var(--green-dim)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
