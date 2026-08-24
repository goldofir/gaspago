'use client'
import { useState, useEffect } from 'react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_pos_token'

type Payment = {
  id: string
  totalAmount: string
  fgolBrlValue: string
  pixAmount: string
  cashbackPercent: number
  status: string
  invoiceUrl: string | null
  createdAt: string
  settledAt?: string
}

function formatPrice(value: string | number) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PAID:            { label: 'Pago',      color: '#10B981' },
  AWAITING_SCAN:   { label: 'Aguardando Scan', color: '#F59E0B' },
  AWAITING_PAYMENT:{ label: 'Aguardando PIX', color: '#3B82F6' },
  EXPIRED:         { label: 'Expirado',  color: '#EF4444' },
  CANCELLED:       { label: 'Cancelado', color: '#64748B' },
}

export default function PosHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalFetch(TOKEN_KEY, `${API}/pos/me/history?limit=50`)
      .then(r => r.json())
      .then(data => setPayments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Balcão POS</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Histórico de Cobranças</h1>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando histórico…</div>
        ) : payments.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhuma cobrança encontrada.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                  {['Data', 'Valor Total', 'FGOL Usado', 'Via PIX', 'Cashback', 'Status', 'Fatura'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const s = STATUS_MAP[p.status] ?? { label: p.status, color: '#64748B' }
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{new Date(p.createdAt).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>{formatPrice(p.totalAmount)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{formatPrice(p.fgolBrlValue)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{formatPrice(p.pixAmount)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{Math.round(p.cashbackPercent * 100)}%</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${s.color}18`, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {p.invoiceUrl ? (
                          <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textDecoration: 'none' }}>
                            🧾 Ver
                          </a>
                        ) : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
