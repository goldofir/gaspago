'use client'

import { useEffect, useState } from 'react'
import { Receipt, ExternalLink, Flame, Store } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type OrderRow = { id: string; status: string; paymentStatus: string; total: number | string; createdAt: string; invoiceUrl: string | null; distributor?: { name: string } }
type PosPaymentRow = { id: string; status: string; totalAmount: number | string; createdAt: string; invoiceUrl: string | null; establishment?: { name: string } }

type Invoice = { id: string; kind: 'gas' | 'marketplace'; label: string; amount: number; status: string; createdAt: string; invoiceUrl: string | null }

const PAYMENT_STATUS_LABEL: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', AWAITING_PAYMENT: 'Aguardando PIX', AWAITING_SCAN: 'Aguardando', FAILED: 'Falhou', REFUNDED: 'Reembolsado', EXPIRED: 'Expirado', CANCELLED: 'Cancelado' }
const PAYMENT_STATUS_COLOR: Record<string, string> = { PENDING: 'var(--amber)', PAID: 'var(--green)', AWAITING_PAYMENT: 'var(--amber)', AWAITING_SCAN: 'var(--amber)', FAILED: 'var(--red)', REFUNDED: 'var(--muted)', EXPIRED: 'var(--red)', CANCELLED: 'var(--red)' }

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function FaturasPage() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/orders?limit=50`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      fetch(`${API}/marketplace/my-purchases`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
    ]).then(([orders, purchases]) => {
      const fromOrders: Invoice[] = (Array.isArray(orders) ? orders as OrderRow[] : []).map(o => ({
        id: o.id, kind: 'gas', label: o.distributor?.name ?? 'Pedido de gás',
        amount: Number(o.total), status: o.paymentStatus ?? o.status, createdAt: o.createdAt, invoiceUrl: o.invoiceUrl,
      }))
      const fromPurchases: Invoice[] = (Array.isArray(purchases) ? purchases as PosPaymentRow[] : []).map(p => ({
        id: p.id, kind: 'marketplace', label: p.establishment?.name ?? 'Compra no marketplace',
        amount: Number(p.totalAmount), status: p.status, createdAt: p.createdAt, invoiceUrl: p.invoiceUrl,
      }))
      setInvoices([...fromOrders, ...fromPurchases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    })
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Financeiro</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>Faturas</h1>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>Cobranças de pedidos de gás e compras no marketplace.</p>
      </div>

      {!invoices ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
      ) : invoices.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          <Receipt size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 14 }}>Nenhuma fatura ainda.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          {invoices.map((inv, i) => (
            <div key={`${inv.kind}-${inv.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--border-lt)' : 'none', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: inv.kind === 'gas' ? 'rgba(255,101,36,.1)' : 'rgba(22,163,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {inv.kind === 'gas' ? <Flame size={14} color="var(--flame)" /> : <Store size={14} color="var(--green)" />}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{inv.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{new Date(inv.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: PAYMENT_STATUS_COLOR[inv.status] ?? 'var(--muted)', background: `${PAYMENT_STATUS_COLOR[inv.status] ?? 'var(--muted)'}18`, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  {PAYMENT_STATUS_LABEL[inv.status] ?? inv.status}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", minWidth: 90, textAlign: 'right' }}>
                  R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {inv.invoiceUrl && (
                  <a href={inv.invoiceUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--flame)', textDecoration: 'none' }}>
                    Ver <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
