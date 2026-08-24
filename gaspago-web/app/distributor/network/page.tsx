'use client'

import { useEffect, useState } from 'react'
import { Share2, Users, Copy, Check } from 'lucide-react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_distributor_token'

type MatrixContact = { id: string; name: string | null; phone: string }
type MatrixLevel = { level: number; count: number; activeCount: number; earned: number }
type MatrixData = {
  levels: MatrixLevel[]
  totalEarned: number
  referralCode: string
  referralLink: string
  referredBy: MatrixContact | null
  placedUnder: MatrixContact | null
}

// Any user — including a distributor's own portal account — can share their
// referral link and earn network commission just like any other affiliate.
// This reuses the exact same /affiliates/:id/matrix endpoint the mobile app's
// "Minha Rede" screen calls; nothing distributor-specific about the earning
// mechanism, it's just not been visible anywhere in the web portal before.
export default function DistributorNetworkPage() {
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return
    let userId = ''
    try {
      userId = JSON.parse(atob(token.split('.')[1])).id
    } catch {
      return
    }
    portalFetch(TOKEN_KEY, `${API}/affiliates/${userId}/matrix`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  function copyLink() {
    if (!data?.referralLink) return
    navigator.clipboard.writeText(data.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Rede de indicação</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Minha Rede</h1>
        <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--sub)' }}>
          Sua distribuidora também ganha indicando gente pro Gás Pago — o mesmo link, a mesma matriz de qualquer afiliado.
        </p>
      </div>

      {/* Referral link */}
      <div style={{ background: 'var(--navy)', borderRadius: 16, padding: 22, marginBottom: 20, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12.5, opacity: 0.7 }}>
          <Share2 size={14} /> Seu link de indicação
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ fontSize: 13, background: 'rgba(255,255,255,.08)', padding: '8px 12px', borderRadius: 8, flex: '1 1 260px', overflowWrap: 'anywhere' }}>
            {data?.referralLink ?? '—'}
          </code>
          <button onClick={copyLink} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Lineage */}
      {(data?.referredBy || data?.placedUnder) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 20, display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13 }}>
          {data?.referredBy && (
            <div><span style={{ color: 'var(--muted)' }}>Quem indicou você: </span><strong>{data.referredBy.name ?? data.referredBy.phone}</strong></div>
          )}
          {data?.placedUnder && (
            <div><span style={{ color: 'var(--muted)' }}>Posicionado abaixo de: </span><strong>{data.placedUnder.name ?? data.placedUnder.phone}</strong></div>
          )}
        </div>
      )}

      {/* Total earned */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Total ganho pela rede</p>
        <p style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Sora',sans-serif", color: 'var(--text)' }}>
          {(data?.totalEarned ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>FGOL</span>
        </p>
      </div>

      {/* Levels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
        {(data?.levels ?? []).map(lvl => (
          <div key={lvl.level} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--flame)', background: 'rgba(255,101,36,.1)', padding: '2px 8px', borderRadius: 20 }}>Nível {lvl.level}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{lvl.earned.toFixed(4)} FGOL</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--sub)' }}>
              <Users size={13} /> {lvl.count} indicados · {lvl.activeCount} ativos
            </div>
          </div>
        ))}
        {(!data?.levels || data.levels.every(l => l.count === 0)) && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: 13 }}>
            Sua rede está vazia ainda. Compartilhe seu link e comece a indicar.
          </div>
        )}
      </div>
    </div>
  )
}
