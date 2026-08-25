'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, Share2, Copy, Check, Coins, Store, ShoppingBag, Receipt, UserCircle, ArrowRight } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type Me = {
  id: string
  name: string | null
  phone: string
  affiliateStatus: 'ACTIVE' | 'BLOCKED' | 'EXPIRED'
  fgolBalance: number | string
  fgolFrozen: number | string
}

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

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativo', BLOCKED: 'Bloqueado', EXPIRED: 'Expirado' }
const STATUS_COLOR: Record<string, string> = { ACTIVE: 'var(--green)', BLOCKED: 'var(--amber)', EXPIRED: 'var(--red)' }

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const QUICK_LINKS = [
  { href: '/painel/perfil', label: 'Perfil & KYC', desc: 'Dados pessoais e verificação de identidade', Icon: UserCircle, color: '#0284C7' },
  { href: '/painel/marketplace', label: 'Marketplace', desc: 'Estabelecimentos parceiros e cashback', Icon: Store, color: '#16A34A' },
  { href: '/painel/pedidos', label: 'Pedidos', desc: 'Histórico de pedidos de gás', Icon: ShoppingBag, color: '#8B5CF6' },
  { href: '/painel/faturas', label: 'Faturas', desc: 'Cobranças e comprovantes de pagamento', Icon: Receipt, color: '#EA580C' },
]

export default function PainelPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [matrix, setMatrix] = useState<MatrixData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: authHeaders() }).then(r => r.json()).then(setMe).catch(() => {})
  }, [])

  useEffect(() => {
    if (!me?.id) return
    fetch(`${API}/affiliates/${me.id}/matrix`, { headers: authHeaders() }).then(r => r.json()).then(setMatrix).catch(() => {})
  }, [me?.id])

  function copyLink() {
    if (!matrix?.referralLink) return
    navigator.clipboard.writeText(matrix.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <style>{`
        .pnl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
        .pnl-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .pnl-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .pnl-link-card:hover { box-shadow: var(--shadow) !important; border-color: var(--flame) !important; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Visão geral</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, margin: 0 }}>
          {me?.name ? `Olá, ${me.name.split(' ')[0]}` : 'Meu painel'}
        </h1>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {me && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[me.affiliateStatus], background: `${STATUS_COLOR[me.affiliateStatus]}18`, padding: '4px 10px', borderRadius: 20 }}>
              {STATUS_LABEL[me.affiliateStatus]}
            </span>
          )}
        </div>
      </div>

      <div className="pnl-grid" style={{ marginBottom: 16 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Wallet size={16} color="var(--flame)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Carteira FGOL</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Sora',sans-serif" }}>
            {me ? Number(me.fgolBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>disponível</div>
          {me && Number(me.fgolFrozen) > 0 && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--amber)' }}>
              {Number(me.fgolFrozen).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} bloqueado (conta inativa)
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>Saques disponíveis no app Gás Pago.</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Share2 size={16} color="var(--flame)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Seu link de indicação</span>
          </div>
          {matrix ? (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={matrix.referralLink} style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: 'var(--sub)', background: 'var(--surface-2)' }} />
                <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', borderRadius: 8, background: copied ? 'var(--green)' : 'var(--flame)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--sub)' }}>
                <div>Quem indicou você: <strong>{matrix.referredBy ? (matrix.referredBy.name ?? matrix.referredBy.phone) : 'Ninguém (cadastro orgânico)'}</strong></div>
                {matrix.placedUnder && matrix.referredBy?.id !== matrix.placedUnder.id && (
                  <div style={{ color: 'var(--flame)', marginTop: 4 }}>↳ Você entrou sob {matrix.placedUnder.name ?? matrix.placedUnder.phone} (indicador com linha cheia)</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coins size={16} color="var(--flame)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Sua rede</span>
          </div>
          {matrix && (
            <span style={{ fontSize: 13, color: 'var(--sub)' }}>
              Total ganho: <strong style={{ color: 'var(--text)' }}>{matrix.totalEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} FGOL</strong>
            </span>
          )}
        </div>
        {!matrix ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
        ) : matrix.levels.every(l => l.count === 0) ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ninguém na sua rede ainda — compartilhe seu link acima.</div>
        ) : (
          <div className="pnl-levels">
            {matrix.levels.map(l => (
              <div key={l.level} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-lt)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--flame)' }}>NÍVEL {l.level}</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Sora',sans-serif", marginTop: 4 }}>{l.count}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.activeCount} ativo{l.activeCount !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 4 }}>{l.earned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} FGOL ganho</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pnl-links">
        {QUICK_LINKS.map(l => (
          <Link key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
            <div className="pnl-link-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow .15s, border-color .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${l.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <l.Icon size={15} color={l.color} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{l.label}</span>
                <ArrowRight size={13} color="var(--muted)" style={{ marginLeft: 'auto' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{l.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
