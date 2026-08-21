'use client'

import { useEffect, useState } from 'react'
import { Crown, Users, XCircle, TrendingUp, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface Stats {
  total: number
  active: number
  cancelled: number
  mrr: number
}

interface SubscriptionUser {
  id: string
  name: string
  phone: string
  email: string
}

interface Subscription {
  id: string
  plan: 'FREE' | 'PREMIUM'
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
  expiresAt: string | null
  asaasSubscriptionId: string | null
  user: SubscriptionUser
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        boxShadow: 'var(--shadow)',
        flex: '1 1 160px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color="#fff" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: 'FREE' | 'PREMIUM' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        background: plan === 'PREMIUM' ? 'rgba(242,184,37,0.15)' : 'rgba(148,163,184,0.15)',
        color: plan === 'PREMIUM' ? 'var(--gold)' : 'var(--muted)',
      }}
    >
      {plan === 'PREMIUM' && <Crown size={11} />}
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' }) {
  const map = {
    ACTIVE: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Ativo' },
    EXPIRED: { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber)', label: 'Expirado' },
    CANCELLED: { bg: 'rgba(239,68,68,0.12)', color: 'var(--red)', label: 'Cancelado' },
  }
  const s = map[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function truncate(str: string | null, len = 20) {
  if (!str) return '—'
  return str.length > len ? str.slice(0, len) + '…' : str
}

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [statsRes, listRes] = await Promise.all([
          fetch(`${API}/admin/subscriptions/stats`, { credentials: 'include' }),
          fetch(`${API}/admin/subscriptions?limit=100`, { credentials: 'include' }),
        ])

        if (!statsRes.ok || !listRes.ok) throw new Error('Erro ao carregar dados')

        const statsData = await statsRes.json()
        const listData = await listRes.json()

        setStats(statsData)
        setSubscriptions(listData.subscriptions ?? [])
      } catch (e: any) {
        setError(e.message ?? 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--ground)',
        padding: '32px 24px',
        fontFamily: 'Inter, sans-serif',
        color: 'var(--text)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Monetização
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Assinaturas Premium
          </h1>
        </div>

        {/* Stats */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sub)', marginBottom: 32 }}>
            <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            Carregando dados...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--red)', marginBottom: 24, padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
            {error}
          </div>
        ) : stats ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 32,
            }}
          >
            <StatCard label="Premium Ativos" value={stats.active} icon={Crown} color="var(--gold)" />
            <StatCard label="Total" value={stats.total} icon={Users} color="var(--sub)" />
            <StatCard label="Cancelados" value={stats.cancelled} icon={XCircle} color="var(--red)" />
            <StatCard
              label="MRR"
              value={`R$ ${stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="var(--flame)"
            />
          </div>
        ) : null}

        {/* Table */}
        {!loading && !error && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
            }}
          >
            {subscriptions.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
                <Crown size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 15 }}>Nenhuma assinatura encontrada</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {['Usuário', 'Plano', 'Status', 'Início', 'Vencimento', 'Asaas ID'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontWeight: 600,
                            color: 'var(--sub)',
                            fontSize: 12,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub, i) => (
                      <tr
                        key={sub.id}
                        style={{
                          borderBottom: i < subscriptions.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{sub.user?.name ?? '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub.user?.phone ?? sub.user?.email ?? '—'}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <PlanBadge plan={sub.plan} />
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <StatusBadge status={sub.status} />
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                          {formatDate(sub.createdAt)}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--sub)', whiteSpace: 'nowrap' }}>
                          {formatDate(sub.expiresAt)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              color: 'var(--muted)',
                              background: 'var(--surface-2)',
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                            title={sub.asaasSubscriptionId ?? ''}
                          >
                            {truncate(sub.asaasSubscriptionId)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 767px) {
          h1 { font-size: 22px !important; }
        }
      `}</style>
    </div>
  )
}
