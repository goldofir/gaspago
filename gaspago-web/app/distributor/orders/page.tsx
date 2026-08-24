'use client'
import { useState, useEffect } from 'react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_distributor_token'

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado',
  IN_DELIVERY: 'Em Entrega', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
}
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', CONFIRMED: '#3B82F6',
  IN_DELIVERY: '#8B5CF6', DELIVERED: '#10B981', CANCELLED: '#EF4444',
}

type Order = {
  id: string
  customer: { name: string; phone: string }
  deliveryAddress: string
  deliveryPostalCode: string
  total: string
  status: string
  paymentStatus: string
  invoiceUrl: string | null
  createdAt: string
  items: { product: { name: string }; quantity: number }[]
}

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED']

export default function DistributorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/distributors/me/orders?status=${filter === 'ALL' ? '' : filter}&limit=50`)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId)
    try {
      await portalFetch(TOKEN_KEY, `${API}/distributors/me/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Distribuidora</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Pedidos</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${filter === s ? 'var(--flame)' : 'var(--border)'}`,
            background: filter === s ? 'var(--flame)' : 'var(--surface)',
            color: filter === s ? '#fff' : 'var(--muted)',
            transition: 'all .15s',
          }}>
            {STATUS_LABELS[s] ?? 'Todos'}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando pedidos…</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum pedido encontrado.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                  {['Cliente', 'Endereço', 'Itens', 'Valor', 'Status', 'Data', 'Ação'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{o.customer?.name ?? '–'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{o.customer?.phone}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.deliveryAddress}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text)', fontSize: 12 }}>
                      {(o.items ?? []).map(i => `${i.quantity}× ${i.product?.name}`).join(', ') || '–'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>R$ {Number(o.total).toFixed(2)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[o.status] ?? '#64748B'}18`, color: STATUS_COLORS[o.status] ?? '#64748B' }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                        {o.status === 'CONFIRMED' && (
                          <button onClick={() => updateStatus(o.id, 'IN_DELIVERY')} disabled={updating === o.id}
                            style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: '#8B5CF618', color: '#8B5CF6', border: '1px solid #8B5CF630', cursor: 'pointer' }}>
                            🛵 Saiu
                          </button>
                        )}
                        {o.status === 'IN_DELIVERY' && (
                          <button onClick={() => updateStatus(o.id, 'DELIVERED')} disabled={updating === o.id}
                            style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: '#10B98118', color: '#10B981', border: '1px solid #10B98130', cursor: 'pointer' }}>
                            ✓ Entregue
                          </button>
                        )}
                        {o.invoiceUrl && (
                          <a href={o.invoiceUrl} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'var(--ground)', color: 'var(--sub)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                            🧾 Fatura
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
