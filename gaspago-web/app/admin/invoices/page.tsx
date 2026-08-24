'use client'

import { useEffect, useState } from 'react'
import { Receipt, Loader2, ExternalLink, ShoppingBag, Store } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface Invoice {
  id: string
  source: 'order' | 'pos'
  party: string
  customerName: string
  amount: string
  status: string
  invoiceUrl: string | null
  createdAt: string
}

const PAID_STATUSES = new Set(['PAID'])

function formatPrice(value: string) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'' | 'true' | 'false'>('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (filter) params.set('paid', filter)
      const res = await adminFetch(`${API}/admin/invoices?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar faturas')
      const data = await res.json()
      setInvoices(data.invoices)
      setTotal(data.total)
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Financeiro
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Faturas
          </h1>
          <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--sub)' }}>
            Cobranças PIX reais geradas no Asaas — pedidos de gás, POS e marketplace. {total} no total.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { key: '', label: 'Todas' },
            { key: 'true', label: 'Pagas' },
            { key: 'false', label: 'Pendentes/outras' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: filter === f.key ? '1px solid var(--flame)' : '1px solid var(--border)',
                background: filter === f.key ? 'rgba(255,101,36,.1)' : 'var(--surface)',
                color: filter === f.key ? 'var(--flame)' : 'var(--sub)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sub)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
          </div>
        ) : error ? (
          <div style={{ color: 'var(--red)', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>
        ) : invoices.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <Receipt size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15 }}>Nenhuma fatura encontrada</div>
            <div style={{ fontSize: 12.5, marginTop: 6 }}>Só aparecem aqui cobranças com uma cobrança PIX real gerada no Asaas.</div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                    {['Origem', 'Cliente', 'Parceiro', 'Valor', 'Status', 'Data', 'Fatura'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sub)', fontSize: 12 }}>
                          {inv.source === 'order' ? <ShoppingBag size={13} /> : <Store size={13} />}
                          {inv.source === 'order' ? 'Pedido de gás' : 'POS/Marketplace'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text)' }}>{inv.customerName}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--sub)' }}>{inv.party}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700 }}>{formatPrice(inv.amount)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: PAID_STATUSES.has(inv.status) ? 'var(--green-dim)' : 'rgba(245,158,11,.12)',
                          color: PAID_STATUSES.has(inv.status) ? 'var(--green)' : 'var(--amber)',
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{new Date(inv.createdAt).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {inv.invoiceUrl ? (
                          <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--flame)', textDecoration: 'none' }}>
                            Abrir <ExternalLink size={12} />
                          </a>
                        ) : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
