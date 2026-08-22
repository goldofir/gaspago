'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Minhas Comiss�es',
  description: 'Hist�rico e detalhes de comiss�es do credenciador no G�s Pago.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_credenciador_token'

type Commission = {
  id: string
  role: string
  amount: string
  currency: string
  status: string
  createdAt: string
  order?: { id: string; distributor?: { name: string } }
  posPayment?: { id: string; establishment?: { name: string } }
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Pendente',  color: '#F59E0B' },
  RELEASED: { label: 'Liberada',  color: '#10B981' },
  BLOCKED:  { label: 'Bloqueada', color: '#EF4444' },
  EXPIRED:  { label: 'Expirada',  color: '#64748B' },
  SETTLED:  { label: 'Sacada',    color: '#3B82F6' },
}

const ROLE_LABELS: Record<string, string> = {
  credenciador:       'Comissão Credenciador',
  consumer_cashback:  'Cashback Consumidor',
  network_l1:         'Rede Nível 1',
  network_l2:         'Rede Nível 2',
  network_l3:         'Rede Nível 3',
  network_l4:         'Rede Nível 4',
  network_l5:         'Rede Nível 5',
}

export default function CredenciadorCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(0)

  useEffect(() => {
    portalFetch(TOKEN_KEY, `${API}/credenciador/me/commissions?limit=100`)
      .then(r => r.json())
      .then((data: Commission[]) => {
        if (!Array.isArray(data)) return
        setCommissions(data)
        const rel = data.filter(c => c.status === 'RELEASED').reduce((s, c) => s + Number(c.amount), 0)
        setAvailable(rel)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Credenciador</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Minhas Comissões</h1>
      </div>

      {/* Available balance */}
      <div style={{ background: 'var(--navy)', borderRadius: 14, padding: '22px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600, marginBottom: 4 }}>Saldo disponível para saque</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {available.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}
            <span style={{ fontSize: 16, color: '#F2B825', marginLeft: 6 }}>FGOL</span>
          </p>
        </div>
        <button style={{ padding: '12px 22px', borderRadius: 10, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          Solicitar Saque
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando comissões…</div>
        ) : commissions.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhuma comissão ainda.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                  {['Data', 'Tipo', 'Origem', 'Valor', 'Moeda', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => {
                  const s = STATUS_MAP[c.status] ?? { label: c.status, color: '#64748B' }
                  const origin = c.order?.distributor?.name ?? c.posPayment?.establishment?.name ?? '–'
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text)' }}>{ROLE_LABELS[c.role] ?? c.role}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{origin}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>{Number(c.amount).toFixed(4)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{c.currency}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${s.color}18`, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
