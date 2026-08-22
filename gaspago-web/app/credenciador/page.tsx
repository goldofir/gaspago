'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard Credenciador',
  description: 'Painel do credenciador no G�s Pago. Acompanhe distribuidoras, estabelecimentos e comiss�es.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { Truck, Store, TrendingUp, Coins } from 'lucide-react'
import { portalFetch } from '../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_credenciador_token'

type Stats = {
  activeDistributors: number
  totalEstablishments: number
  monthlyCommissions: number
  releasedCommissions: number
}
type WeekData = { week: string; amount: number }
type Activity = { id: string; type: 'distributor' | 'establishment'; name: string; createdAt: string }

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

function BarChart({ data }: { data: WeekData[] }) {
  const max = Math.max(...data.map(d => d.amount), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, padding: '0 4px' }}>
      {data.map(d => (
        <div key={d.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', background: 'var(--flame)', borderRadius: '4px 4px 0 0', height: `${Math.max(4, (d.amount / max) * 70)}px`, transition: 'height .3s', opacity: 0.85 }} />
          <span style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center' }}>{d.week}</span>
        </div>
      ))}
    </div>
  )
}

export default function CredenciadorPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    portalFetch(TOKEN_KEY, `${API}/credenciador/me/stats`).then(r => r.json()).then(setStats).catch(() => {})
    portalFetch(TOKEN_KEY, `${API}/credenciador/me/commissions/weekly`).then(r => r.json()).then(setWeeks).catch(() => {})
    portalFetch(TOKEN_KEY, `${API}/credenciador/me/activity?limit=5`).then(r => r.json()).then(setActivities).catch(() => {})
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Credenciador</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Distribuidoras Ativas" value={stats?.activeDistributors ?? '–'} Icon={Truck} color="#3B82F6" />
        <StatCard label="Estabelecimentos" value={stats?.totalEstablishments ?? '–'} Icon={Store} color="#8B5CF6" />
        <StatCard label="Comissões do Mês" value={stats ? `${stats.monthlyCommissions.toFixed(2)} FGOL` : '–'} Icon={Coins} color="#F59E0B" />
        <StatCard label="Comissões Liberadas" value={stats ? `${stats.releasedCommissions.toFixed(2)} FGOL` : '–'} sub="disponíveis" Icon={TrendingUp} color="#10B981" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Weekly chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Comissões — últimas 4 semanas</h2>
          {weeks.length > 0 ? <BarChart data={weeks} /> : (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sem dados ainda</span>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Atividades recentes</h2>
          {activities.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>Nenhuma atividade recente.</p>
          ) : (
            activities.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: a.type === 'distributor' ? '#3B82F618' : '#8B5CF618', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {a.type === 'distributor' ? <Truck size={13} color="#3B82F6" /> : <Store size={13} color="#8B5CF6" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.type === 'distributor' ? 'Distribuidora' : 'Estabelecimento'} · {new Date(a.createdAt).toLocaleDateString('pt-BR')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
