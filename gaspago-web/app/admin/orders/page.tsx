'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  Search,
  ShoppingBag,
  MessageCircle,
  Smartphone,
  Filter,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'IN_DELIVERY' | 'DELIVERED' | 'CANCELLED'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
type Channel = 'APP' | 'WHATSAPP' | string

interface OrderCustomer {
  id: string
  name: string
  phone: string
}

interface OrderDistributor {
  id: string
  name: string
}

interface Order {
  id: string
  customerId: string
  distributorId: string
  status: OrderStatus
  total: number
  paymentStatus: PaymentStatus
  paymentMethod: string | null
  channel: Channel
  createdAt: string
  customer: OrderCustomer
  distributor: OrderDistributor
  _count: { items: number }
}

interface Stats {
  total: number
  pending: number
  inDelivery: number
  delivered: number
  cancelled: number
}

const STATUS_FILTER_OPTIONS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Confirmado', value: 'CONFIRMED' },
  { label: 'Em Entrega', value: 'IN_DELIVERY' },
  { label: 'Entregue', value: 'DELIVERED' },
  { label: 'Cancelado', value: 'CANCELLED' },
]

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_DELIVERY: 'Em Entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Aguardando',
  PAID: 'Pago',
  FAILED: 'Falhou',
  REFUNDED: 'Reembolsado',
}

function statusBadgeStyle(status: OrderStatus): React.CSSProperties {
  const map: Record<OrderStatus, React.CSSProperties> = {
    PENDING: { background: 'var(--amber-dim)', color: 'var(--amber)' },
    CONFIRMED: { background: 'rgba(37,99,235,.10)', color: '#2563EB' },
    IN_DELIVERY: { background: 'rgba(37,99,235,.10)', color: '#2563EB' },
    DELIVERED: { background: 'var(--green-dim)', color: 'var(--green)' },
    CANCELLED: { background: 'var(--red-dim)', color: 'var(--red)' },
  }
  return map[status] ?? {}
}

function paymentBadgeStyle(status: PaymentStatus): React.CSSProperties {
  const map: Record<PaymentStatus, React.CSSProperties> = {
    PENDING: { background: 'var(--amber-dim)', color: 'var(--amber)' },
    PAID: { background: 'var(--green-dim)', color: 'var(--green)' },
    FAILED: { background: 'var(--red-dim)', color: 'var(--red)' },
    REFUNDED: { background: 'rgba(37,99,235,.10)', color: '#2563EB' },
  }
  return map[status] ?? {}
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function ChannelBadge({ channel }: { channel: Channel }) {
  const isWhatsapp = channel?.toUpperCase() === 'WHATSAPP'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: isWhatsapp ? 'rgba(34,197,94,.12)' : 'var(--flame-dim)',
        color: isWhatsapp ? '#16a34a' : 'var(--flame)',
      }}
    >
      {isWhatsapp ? <MessageCircle size={10} /> : <Smartphone size={10} />}
      {isWhatsapp ? 'WhatsApp' : 'App'}
    </span>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  loading: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, fontWeight: 500 }}>{label}</p>
        {loading ? (
          <div
            style={{
              width: 48,
              height: 22,
              borderRadius: 6,
              background: 'var(--border)',
              marginTop: 4,
            }}
          />
        ) : (
          <p
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text)',
              margin: '2px 0 0',
              fontFamily: 'Sora, sans-serif',
              lineHeight: 1,
            }}
          >
            {value.toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        color: 'var(--muted)',
      }}
    >
      <ShoppingBag size={48} strokeWidth={1.2} style={{ marginBottom: 16, opacity: 0.4 }} />
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--sub)', margin: '0 0 6px' }}>
        Nenhum pedido encontrado
      </p>
      <p style={{ fontSize: 14, margin: 0 }}>Tente ajustar os filtros ou a busca</p>
    </div>
  )
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true)
      try {
        const res = await fetch(`${API}/admin/orders/stats`)
        if (!res.ok) throw new Error('Erro ao carregar estatísticas')
        const data = await res.json()
        setStats(data)
      } catch (e: any) {
        console.error(e)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [])

  useEffect(() => {
    async function fetchOrders() {
      setLoadingOrders(true)
      setError(null)
      try {
        const params = new URLSearchParams({ limit: '100' })
        if (statusFilter !== 'ALL') params.set('status', statusFilter)
        const res = await fetch(`${API}/admin/orders?${params}`)
        if (!res.ok) throw new Error('Erro ao carregar pedidos')
        const data = await res.json()
        setOrders(data)
      } catch (e: any) {
        setError(e.message ?? 'Erro desconhecido')
      } finally {
        setLoadingOrders(false)
      }
    }
    fetchOrders()
  }, [statusFilter])

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer?.name?.toLowerCase().includes(q) ||
        o.customer?.phone?.includes(q)
    )
  }, [orders, search])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {
          --flame: #FF6524;
          --navy: #0A1628;
          --gold: #F2B825;
          --ground: #F4F6FA;
          --surface: #FFF;
          --surface-2: #F8FAFC;
          --border: #E2E8F0;
          --border-lt: #EEF2F7;
          --text: #0F2040;
          --sub: #475569;
          --muted: #94A3B8;
          --green: #22C55E;
          --green-dim: rgba(34,197,94,.10);
          --red: #EF4444;
          --red-dim: rgba(239,68,68,.10);
          --amber: #F59E0B;
          --amber-dim: rgba(245,158,11,.10);
          --shadow-sm: 0 1px 3px rgba(15,32,64,.06);
          --shadow: 0 4px 16px rgba(15,32,64,.08);
          --flame-dim: rgba(255,101,36,.10);
        }

        * { box-sizing: border-box; }

        .orders-page {
          font-family: 'Inter', sans-serif;
          background: var(--ground);
          min-height: 100vh;
          padding: 32px 24px;
          color: var(--text);
        }

        .stats-row {
          display: flex;
          gap: 16px;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .chip-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .chip {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--sub);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
        }

        .chip:hover {
          border-color: var(--flame);
          color: var(--flame);
        }

        .chip.active {
          background: var(--flame);
          border-color: var(--flame);
          color: #fff;
          font-weight: 600;
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 340px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--surface);
          font-size: 14px;
          color: var(--text);
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color .15s;
        }

        .search-input:focus {
          border-color: var(--flame);
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .order-row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-sm);
          transition: box-shadow .15s;
        }

        .order-row:hover {
          box-shadow: var(--shadow);
        }

        .order-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 140px;
        }

        .order-id {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: .02em;
        }

        .order-date {
          font-size: 12px;
          color: var(--muted);
        }

        .order-middle {
          flex: 1;
          min-width: 0;
        }

        .customer-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .customer-phone {
          font-size: 12px;
          color: var(--sub);
          margin-top: 1px;
        }

        .distributor-name {
          font-size: 12px;
          color: var(--muted);
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .order-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .order-total {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }

        .badge-row {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .skeleton {
          background: linear-gradient(90deg, var(--border) 25%, var(--border-lt) 50%, var(--border) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .skeleton-row {
          height: 76px;
        }

        .error-box {
          background: var(--red-dim);
          border: 1px solid var(--red);
          border-radius: 12px;
          padding: 16px 20px;
          color: var(--red);
          font-size: 14px;
          font-weight: 500;
        }

        @media (max-width: 767px) {
          .orders-page {
            padding: 20px 16px;
          }

          .stats-row {
            gap: 10px;
          }

          .order-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
          }

          .order-left {
            width: 100%;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .order-middle {
            width: 100%;
          }

          .order-right {
            width: 100%;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .badge-row {
            justify-content: flex-start;
          }

          .search-wrapper {
            max-width: 100%;
            width: 100%;
          }

          .filter-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="orders-page">
        {/* Header */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--flame)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            fontWeight: 600,
            margin: '0 0 4px',
          }}
        >
          Operações
        </p>
        <h1
          style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--text)',
            margin: '0 0 28px',
          }}
        >
          Pedidos
        </h1>

        {/* Stats */}
        <div className="stats-row">
          <StatCard
            label="Total de Pedidos"
            value={stats?.total ?? 0}
            icon={Package}
            color="var(--flame)"
            loading={loadingStats}
          />
          <StatCard
            label="Pendentes"
            value={stats?.pending ?? 0}
            icon={Clock}
            color="var(--amber)"
            loading={loadingStats}
          />
          <StatCard
            label="Em Entrega"
            value={stats?.inDelivery ?? 0}
            icon={Truck}
            color="#2563EB"
            loading={loadingStats}
          />
          <StatCard
            label="Entregues"
            value={stats?.delivered ?? 0}
            icon={CheckCircle}
            color="var(--green)"
            loading={loadingStats}
          />
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="chip-group">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chip${statusFilter === opt.value ? ' active' : ''}`}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="search-wrapper">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por ID ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        {error && <div className="error-box">{error}</div>}

        {!error && loadingOrders && (
          <div className="orders-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-row" />
            ))}
          </div>
        )}

        {!error && !loadingOrders && filteredOrders.length === 0 && <EmptyState />}

        {!error && !loadingOrders && filteredOrders.length > 0 && (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order.id} className="order-row">
                {/* Left */}
                <div className="order-left">
                  <div>
                    <span className="order-id">#{order.id.slice(0, 8)}</span>
                  </div>
                  <ChannelBadge channel={order.channel} />
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                </div>

                {/* Middle */}
                <div className="order-middle">
                  <div className="customer-name">{order.customer?.name ?? '—'}</div>
                  <div className="customer-phone">{order.customer?.phone ?? ''}</div>
                  <div className="distributor-name">
                    {order.distributor?.name ?? '—'}
                    {order._count?.items != null && (
                      <span style={{ marginLeft: 6, color: 'var(--muted)' }}>
                        · {order._count.items} {order._count.items === 1 ? 'item' : 'itens'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="order-right">
                  <span className="order-total">{formatCurrency(order.total)}</span>
                  <div className="badge-row">
                    <span
                      className="status-badge"
                      style={statusBadgeStyle(order.status)}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                    <span
                      className="status-badge"
                      style={paymentBadgeStyle(order.paymentStatus)}
                    >
                      {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
