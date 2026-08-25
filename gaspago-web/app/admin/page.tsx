'use client'
import { useState, useEffect } from 'react'
import {
  AlertTriangle, CheckCircle2, Coins, ArrowRight, Users, ShoppingBag, TrendingUp,
  Wallet, Truck, Store, CreditCard, Network,
} from 'lucide-react'
import Link from 'next/link'
import { adminFetch } from '../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type CredStatus = { allSet: boolean; missing: string[] }

type DashboardData = {
  kpis: {
    totalUsers: number
    activeAffiliates: number
    totalOrders: number
    totalDistributors: number
    activeDistributors: number
    totalEstablishments: number
    activeEstablishments: number
    activeSubscriptions: number
    networkSize: number
    gmv: number
    companyRevenue: number
    commissionsPaid: number
  }
  ordersByStatus: { status: string; count: number }[]
  series: {
    ordersPerDay: { date: string; value: number }[]
    usersPerDay: { date: string; value: number }[]
    revenuePerDay: { date: string; value: number }[]
  }
  topDistributors: { id: string; name: string; orders: number; revenue: number }[]
  recentOrders: { id: string; status: string; total: number; createdAt: string; customerName: string; distributorName: string }[]
}

const integrations = [
  { key: 'asaas',    label: 'Asaas',         desc: 'Pagamentos e subcontas PIX' },
  { key: 'conexbot', label: 'Conexbot',       desc: 'Gateway WhatsApp / Meta' },
  { key: 'polygon',  label: 'Polygon / FGOL', desc: 'Contrato ERC-20' },
  { key: 'web3auth', label: 'Web3Auth',       desc: 'Carteiras embedded (MPC)' },
  { key: 'auth',     label: 'Autenticação',  desc: 'JWT e sessões' },
  { key: 'email',    label: 'E-mail SMTP',   desc: 'E-mails transacionais' },
]

const tokenMeta = [
  { label: 'Contrato',  value: '0xa1B7797F97eE6C928A6Ce0E403f345b68945C6D7' },
  { label: 'Rede',      value: 'Polygon PoS' },
  { label: 'Supply',    value: '1.000.000.000 FGOL' },
  { label: 'DEX Pools', value: 'FGOL/WETH · FGOL/WBTC (SushiSwap)' },
]

const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  IN_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING: 'var(--amber)',
  CONFIRMED: '#0284C7',
  IN_DELIVERY: 'var(--flame)',
  DELIVERED: 'var(--green)',
  CANCELLED: 'var(--red)',
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function fmtCompact(n: number) {
  return n.toLocaleString('pt-BR')
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '16px 18px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} color={accent} />
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Sora',sans-serif", color: 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

// Hand-rolled area/line chart — no charting dependency, matches the rest of
// this admin's plain-inline-style approach. `data` must be non-empty.
function TrendChart({ data, color, formatValue }: { data: { date: string; value: number }[]; color: string; formatValue: (n: number) => string }) {
  const width = 560
  const height = 96
  const pad = 6
  const max = Math.max(1, ...data.map(d => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (width - pad * 2)
    const y = height - pad - (d.value / max) * (height - pad * 2)
    return { x, y }
  })
  const linePath = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `${pad},${height - pad} ${linePath} ${width - pad},${height - pad}`

  const firstLabel = data[0]?.date.slice(5).replace('-', '/')
  const lastLabel = data[data.length - 1]?.date.slice(5).replace('-', '/')

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Sora',sans-serif", color: 'var(--text)' }}>{formatValue(total)}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>últimos 30 dias</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
        <polygon points={areaPath} fill={color} opacity={0.12} />
        <polyline points={linePath} fill="none" stroke={color} strokeWidth={2} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5, color: 'var(--muted)', fontFamily: "'JetBrains Mono',monospace" }}>
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
    </div>
  )
}

function StatusBars({ data, total }: { data: { status: string; count: number }[]; total: number }) {
  const order = ['PENDING', 'CONFIRMED', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED']
  const byStatus = new Map(data.map(d => [d.status, d.count]))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {order.map(status => {
        const count = byStatus.get(status) ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={status}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ color: 'var(--sub)', fontWeight: 600 }}>{ORDER_STATUS_LABEL[status]}</span>
              <span style={{ color: 'var(--muted)' }}>{count}</span>
            </div>
            <div style={{ height: 7, borderRadius: 20, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: ORDER_STATUS_COLOR[status], borderRadius: 20, transition: 'width .3s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DashboardPage() {
  const [creds, setCreds] = useState<CredStatus | null>(null)
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [loadingDash, setLoadingDash] = useState(true)

  useEffect(() => {
    adminFetch(`${API}/admin/credentials/status`)
      .then(r => r.json()).then(setCreds).catch(() => {})
    adminFetch(`${API}/admin/dashboard`)
      .then(r => r.json()).then(setDash).catch(() => setDash(null))
      .finally(() => setLoadingDash(false))
  }, [])

  const allSet = creds?.allSet ?? false
  const missing = creds?.missing ?? []
  const k = dash?.kpis
  const totalOrdersByStatus = (dash?.ordersByStatus ?? []).reduce((s, o) => s + o.count, 0)

  return (
    <div>
      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
        }
        .chart-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 16px;
        }
        .token-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .integ-card:hover {
          box-shadow: var(--shadow) !important;
          border-color: var(--flame) !important;
        }
        table.rec-table { width: 100%; border-collapse: collapse; }
        table.rec-table th { text-align: left; font-size: 10.5; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; padding: 0 10px 8px; }
        table.rec-table td { padding: 9px 10px; font-size: 12.5; border-top: 1px solid var(--border-lt); color: var(--text); }
        @media (max-width: 480px) {
          .token-grid { grid-template-columns: 1fr; }
          .dash-grid  { grid-template-columns: 1fr 1fr; }
          .kpi-grid   { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Visão geral
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1.2 }}>
          Dashboard
        </h1>
      </div>

      {/* Alert */}
      {creds && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px', borderRadius: 12, marginBottom: 24,
          background: allSet ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${allSet ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
        }}>
          {allSet
            ? <CheckCircle2 size={17} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={17} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: allSet ? '#166534' : '#991B1B' }}>
              {allSet ? 'Todas as credenciais configuradas' : `${missing.length} credencial(is) ausente(s)`}
            </p>
            {!allSet && (
              <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 3, wordBreak: 'break-word' }}>
                {missing.join(', ')}
              </p>
            )}
          </div>
          {!allSet && (
            <Link href="/admin/credentials" style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
              color: 'var(--red)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Configurar <ArrowRight size={12} />
            </Link>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)', marginBottom: 12, letterSpacing: '-.01em' }}>
          Métricas
        </h2>
        {loadingDash ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>
        ) : !k ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Não foi possível carregar as métricas.</div>
        ) : (
          <div className="kpi-grid">
            <KpiCard icon={Users} label="Usuários" value={fmtCompact(k.totalUsers)} accent="#0284C7" />
            <KpiCard icon={Network} label="Afiliados ativos" value={fmtCompact(k.activeAffiliates)} accent="var(--flame)" />
            <KpiCard icon={ShoppingBag} label="Pedidos" value={fmtCompact(k.totalOrders)} accent="#8B5CF6" />
            <KpiCard icon={TrendingUp} label="GMV" value={fmtBRL(k.gmv)} accent="var(--green)" />
            <KpiCard icon={Wallet} label="Receita da empresa" value={fmtBRL(k.companyRevenue)} accent="var(--gold)" />
            <KpiCard icon={Coins} label="Comissões pagas" value={fmtBRL(k.commissionsPaid)} accent="#EA580C" />
            <KpiCard icon={Truck} label="Distribuidoras" value={`${k.activeDistributors}/${k.totalDistributors}`} accent="#0891B2" />
            <KpiCard icon={Store} label="Estabelecimentos" value={`${k.activeEstablishments}/${k.totalEstablishments}`} accent="#16A34A" />
            <KpiCard icon={CreditCard} label="Assinantes ativos" value={fmtCompact(k.activeSubscriptions)} accent="#DC2626" />
            <KpiCard icon={Network} label="Posições na rede" value={fmtCompact(k.networkSize)} accent="#7C3AED" />
          </div>
        )}
      </div>

      {/* Charts */}
      {dash && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)', marginBottom: 12, letterSpacing: '-.01em' }}>
            Tendência (30 dias)
          </h2>
          <div className="chart-grid">
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>Pedidos</div>
              <TrendChart data={dash.series.ordersPerDay} color="#8B5CF6" formatValue={fmtCompact} />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>Novos usuários</div>
              <TrendChart data={dash.series.usersPerDay} color="#0284C7" formatValue={fmtCompact} />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>Receita da empresa</div>
              <TrendChart data={dash.series.revenuePerDay} color="var(--flame)" formatValue={fmtBRL} />
            </div>
          </div>
        </div>
      )}

      {/* Status + Top distribuidoras */}
      {dash && (
        <div className="chart-grid" style={{ marginBottom: 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 14 }}>Pedidos por status</div>
            {totalOrdersByStatus === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum pedido ainda.</div>
            ) : (
              <StatusBars data={dash.ordersByStatus} total={totalOrdersByStatus} />
            )}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>Top distribuidoras</div>
            {dash.topDistributors.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>Sem pedidos pagos ainda.</div>
            ) : (
              <table className="rec-table">
                <thead><tr><th>Distribuidora</th><th>Pedidos</th><th>Faturamento</th></tr></thead>
                <tbody>
                  {dash.topDistributors.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>{d.orders}</td>
                      <td style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fmtBRL(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {dash && dash.recentOrders.length > 0 && (
        <div style={{ marginBottom: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Pedidos recentes</div>
            <Link href="/admin/orders" style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="rec-table">
              <thead><tr><th>Cliente</th><th>Distribuidora</th><th>Status</th><th>Valor</th><th>Data</th></tr></thead>
              <tbody>
                {dash.recentOrders.map(o => (
                  <tr key={o.id}>
                    <td>{o.customerName}</td>
                    <td>{o.distributorName}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ORDER_STATUS_COLOR[o.status], background: `${ORDER_STATUS_COLOR[o.status]}18`, padding: '2px 8px', borderRadius: 20 }}>
                        {ORDER_STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono',monospace" }}>{fmtBRL(o.total)}</td>
                    <td style={{ color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Integrations grid */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)', marginBottom: 12, letterSpacing: '-.01em' }}>
          Integrações
        </h2>
        <div className="dash-grid">
          {integrations.map(g => (
            <Link key={g.key} href="/admin/credentials" style={{ textDecoration: 'none' }}>
              <div className="integ-card" style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                boxShadow: 'var(--shadow-sm)', transition: 'box-shadow .15s, border-color .15s',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{g.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Token card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #627EEA 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Coins size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Token FGOL</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>ERC-20 · Polygon PoS</div>
          </div>
        </div>
        <div className="token-grid">
          {tokenMeta.map(x => (
            <div key={x.label} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-lt)',
              borderRadius: 9, padding: '11px 14px',
            }}>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{x.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>{x.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
