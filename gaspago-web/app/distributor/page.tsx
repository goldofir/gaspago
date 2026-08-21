'use client'
import { useState, useEffect } from 'react'
import { ShoppingBag, Truck, Star, TrendingUp } from 'lucide-react'
import { portalFetch } from '../_components/portalFetch'

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

type Order = { id: string; customer: { name: string }; deliveryAddress: string; total: string; status: string; createdAt: string }
type Stats = { ordersToday: number; inDelivery: number; monthlyRevenue: number; avgRating: number }

function StatCard({ label, value, sub, Icon, color }: { label: string; value: string | number; sub?: string; Icon: any; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function DistributorPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [cashback, setCashback] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    portalFetch(TOKEN_KEY, `${API}/distributors/me/stats`).then(r => r.json()).then(setStats).catch(() => {})
    portalFetch(TOKEN_KEY, `${API}/distributors/me/orders?limit=10`).then(r => r.json()).then(setOrders).catch(() => {})
    portalFetch(TOKEN_KEY, `${API}/distributors/me`).then(r => r.json()).then(d => setCashback(String(Math.round((d.cashbackPercent ?? 0.2) * 100)))).catch(() => {})
  }, [])

  async function saveCashback() {
    setSaving(true)
    try {
      await portalFetch(TOKEN_KEY, `${API}/distributors/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashbackPercent: parseFloat(cashback) / 100 }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Painel</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Dashboard</h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Pedidos Hoje" value={stats?.ordersToday ?? '–'} Icon={ShoppingBag} color="#3B82F6" />
        <StatCard label="Em Entrega" value={stats?.inDelivery ?? '–'} Icon={Truck} color="#8B5CF6" />
        <StatCard label="Faturamento (mês)" value={stats ? `R$ ${Number(stats.monthlyRevenue).toFixed(2)}` : '–'} Icon={TrendingUp} color="#10B981" />
        <StatCard label="Avaliação Média" value={stats?.avgRating?.toFixed(1) ?? '–'} sub="de 5 estrelas" Icon={Star} color="#F59E0B" />
      </div>

      {/* Cashback config */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Cashback oferecido</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', maxWidth: 120 }}>
            <input
              type="number" min={0} max={50} value={cashback} onChange={e => setCashback(e.target.value)}
              style={{ width: '100%', padding: '10px 32px 10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 16, fontWeight: 700, color: 'var(--text)', background: 'var(--ground)' }}
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--muted)' }}>%</span>
          </div>
          <button onClick={saveCashback} disabled={saving} style={{ padding: '10px 20px', borderRadius: 9, background: saved ? '#10B981' : 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'background .2s' }}>
            {saved ? '✓ Salvo' : saving ? 'Salvando…' : 'Salvar'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>% do valor do pedido disponível como cashback para distribuição na rede</span>
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Últimos pedidos</h2>
        {orders.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>Nenhum pedido ainda.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Cliente', 'Endereço', 'Valor', 'Status', 'Data'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)' }}>{o.customer?.name ?? '–'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.deliveryAddress}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text)' }}>R$ {Number(o.total).toFixed(2)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[o.status] ?? '#64748B'}18`, color: STATUS_COLORS[o.status] ?? '#64748B' }}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
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
