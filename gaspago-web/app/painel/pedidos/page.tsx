'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, ExternalLink } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type OrderRow = {
  id: string; status: string; total: number | string; createdAt: string
  invoiceUrl: string | null; distributor?: { name: string }
}

const STATUS_LABEL: Record<string, string> = { PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_DELIVERY: 'Em entrega', DELIVERED: 'Entregue', CANCELLED: 'Cancelado' }
const STATUS_COLOR: Record<string, string> = { PENDING: 'var(--amber)', CONFIRMED: '#0284C7', IN_DELIVERY: 'var(--flame)', DELIVERED: 'var(--green)', CANCELLED: 'var(--red)' }

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/orders?limit=50`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Gás</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>Pedidos</h1>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
      ) : orders.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          <ShoppingBag size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 14, marginBottom: 4 }}>Nenhum pedido ainda.</div>
          <div style={{ fontSize: 12.5 }}>Peça gás pelo app Gás Pago.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          {orders.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderTop: i > 0 ? '1px solid var(--border-lt)' : 'none', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.distributor?.name ?? 'Distribuidora'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[o.status], background: `${STATUS_COLOR[o.status]}18`, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", minWidth: 90, textAlign: 'right' }}>
                  R$ {Number(o.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {o.invoiceUrl && (
                  <a href={o.invoiceUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--flame)', textDecoration: 'none' }}>
                    Fatura <ExternalLink size={11} />
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
