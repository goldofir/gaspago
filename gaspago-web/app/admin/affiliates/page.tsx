'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type AffiliateStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED'

interface UserStats {
  total: number
  active: number
  blocked: number
  expired: number
}

interface AffiliateUser {
  id: string
  name: string | null
  phone: string
  email: string | null
  affiliateStatus: AffiliateStatus
  fgolBalance: number
  fgolFrozen: number
  lastPurchaseAt: string | null
  createdAt: string
  _count: {
    orders: number
    commissionsReceived: number
  }
}

type FilterOption = 'all' | AffiliateStatus

const STATUS_LABEL: Record<AffiliateStatus, string> = {
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  EXPIRED: 'Expirado',
}

const STATUS_COLORS: Record<AffiliateStatus, { bg: string; color: string }> = {
  ACTIVE: { bg: 'var(--green-dim)', color: 'var(--green)' },
  BLOCKED: { bg: 'var(--amber-dim)', color: 'var(--amber)' },
  EXPIRED: { bg: 'var(--red-dim)', color: 'var(--red)' },
}

function StatusBadge({ status }: { status: AffiliateStatus }) {
  const colors = STATUS_COLORS[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        background: colors.bg,
        color: colors.color,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--flame)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number | undefined
  accent?: string
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: 'var(--shadow)',
        flex: '1 1 160px',
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          fontWeight: 500,
          margin: '0 0 6px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 28,
          fontWeight: 800,
          fontFamily: 'Sora, sans-serif',
          color: accent ?? 'var(--text)',
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value === undefined ? '—' : value.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'BLOCKED', label: 'Bloqueados' },
  { value: 'EXPIRED', label: 'Expirados' },
]

export default function AffiliatesPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [users, setUsers] = useState<AffiliateUser[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<FilterOption>('all')
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    setLoadingStats(true)
    adminFetch(`${API}/admin/users/stats`)
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false))
  }, [])

  const fetchUsers = useCallback((f: FilterOption) => {
    setLoadingUsers(true)
    const params = new URLSearchParams({ limit: '50', offset: '0' })
    if (f !== 'all') params.set('status', f)
    adminFetch(`${API}/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {
        setUsers([])
        setTotal(0)
      })
      .finally(() => setLoadingUsers(false))
  }, [])

  useEffect(() => {
    fetchUsers(filter)
  }, [filter, fetchUsers])

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

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
          --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
          --shadow: 0 1px 4px rgba(0,0,0,.08), 0 4px 12px rgba(0,0,0,.04);
          --flame-dim: rgba(255,101,36,.10);
        }

        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--ground); color: var(--text); }

        .stats-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .filter-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .chip {
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--sub);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .chip:hover { border-color: var(--flame); color: var(--flame); }
        .chip.active { background: var(--flame); color: #fff; border-color: var(--flame); }

        .table-wrap {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .table-header {
          background: var(--surface-2);
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .table-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }

        .count-badge {
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-lt);
          background: var(--surface-2);
          white-space: nowrap;
        }

        td {
          padding: 14px 16px;
          font-size: 13px;
          color: var(--sub);
          border-bottom: 1px solid var(--border-lt);
          vertical-align: middle;
        }

        tr:last-child td { border-bottom: none; }
        tr:hover td { background: var(--ground); }

        .user-name {
          font-weight: 600;
          color: var(--text);
          font-size: 13px;
        }

        .user-phone {
          font-size: 12px;
          color: var(--muted);
          margin-top: 2px;
        }

        .fgol-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
        }

        .empty-state {
          padding: 56px 24px;
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          background: var(--ground);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }

        .empty-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 6px 0;
        }

        .empty-sub {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
        }

        /* Mobile cards */
        .mobile-cards { display: none; }

        @media (max-width: 767px) {
          .stats-row { gap: 10px; }
          .stats-row > * { flex: 1 1 calc(50% - 5px); min-width: 0; }

          table, thead, tbody, th, td, tr { display: block; }
          thead { display: none; }

          .desktop-table { display: none; }
          .mobile-cards { display: block; padding: 12px; }

          .mobile-card {
            background: var(--surface);
            border: 1px solid var(--border-lt);
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 10px;
          }

          .mobile-card-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .mobile-card-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--muted);
            margin-bottom: 4px;
          }

          .mobile-card-val {
            color: var(--sub);
            font-weight: 500;
          }
        }

        @media (min-width: 768px) {
          .desktop-table { display: table; width: 100%; }
        }
      `}</style>

      {/* Page header */}
      <p
        style={{
          fontSize: 12,
          color: 'var(--flame)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 4px 0',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Rede
      </p>
      <h1
        style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: 26,
          fontWeight: 800,
          color: 'var(--text)',
          margin: '0 0 28px 0',
        }}
      >
        Afiliados
      </h1>

      {/* Stats row */}
      <div className="stats-row">
        <StatCard label="Total Usuários" value={loadingStats ? undefined : stats?.total} />
        <StatCard label="Ativos" value={loadingStats ? undefined : stats?.active} accent="var(--green)" />
        <StatCard label="Bloqueados" value={loadingStats ? undefined : stats?.blocked} accent="var(--amber)" />
        <StatCard label="Expirados" value={loadingStats ? undefined : stats?.expired} accent="var(--red)" />
      </div>

      {/* Filter chips */}
      <div className="filter-chips">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`chip${filter === opt.value ? ' active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-header">
          <p className="table-title">Usuários</p>
          <span className="count-badge">{total.toLocaleString('pt-BR')} registros</span>
        </div>

        {loadingUsers ? (
          <Spinner />
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="empty-title">Nenhum usuário encontrado</p>
            <p className="empty-sub">Tente ajustar os filtros para ver mais resultados.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="desktop-table">
              <thead>
                <tr>
                  <th>Nome / Telefone</th>
                  <th>Status</th>
                  <th>Saldo FGOL</th>
                  <th>Pedidos</th>
                  <th>Último Pedido</th>
                  <th>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-name">{u.name ?? '—'}</div>
                      <div className="user-phone">{u.phone}</div>
                    </td>
                    <td>
                      <StatusBadge status={u.affiliateStatus} />
                    </td>
                    <td>
                      <span className="fgol-val">{u.fgolBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td>{u._count.orders}</td>
                    <td>{fmtDate(u.lastPurchaseAt)}</td>
                    <td>{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="mobile-cards">
              {users.map((u) => (
                <div key={u.id} className="mobile-card">
                  <div className="mobile-card-top">
                    <div>
                      <div className="user-name">{u.name ?? '—'}</div>
                      <div className="user-phone">{u.phone}</div>
                    </div>
                    <StatusBadge status={u.affiliateStatus} />
                  </div>
                  <div className="mobile-card-row">
                    <span>Saldo FGOL</span>
                    <span className="fgol-val mobile-card-val">
                      {u.fgolBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="mobile-card-row">
                    <span>Pedidos</span>
                    <span className="mobile-card-val">{u._count.orders}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span>Último pedido</span>
                    <span className="mobile-card-val">{fmtDate(u.lastPurchaseAt)}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span>Cadastro</span>
                    <span className="mobile-card-val">{fmtDate(u.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
