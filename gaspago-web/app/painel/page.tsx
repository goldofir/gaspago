'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet, Share2, ShoppingBag, LogOut, Copy, Check, Coins, Star, Loader2,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type Me = {
  id: string
  name: string | null
  phone: string
  cpf: string | null
  plan: string
  referralCode: string
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

type SubInfo = { plan: string; status: string; expiresAt: string | null }
type PlanOption = { id: string; name: string; slug: string; price: number; billingCycle: string; features: string[] }
type OrderRow = { id: string; status: string; total: number | string; createdAt: string; distributor?: { name: string } }

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativo', BLOCKED: 'Bloqueado', EXPIRED: 'Expirado' }
const STATUS_COLOR: Record<string, string> = { ACTIVE: 'var(--green)', BLOCKED: 'var(--amber)', EXPIRED: 'var(--red)' }
const ORDER_STATUS_LABEL: Record<string, string> = { PENDING: 'Pendente', CONFIRMED: 'Confirmado', IN_DELIVERY: 'Em entrega', DELIVERED: 'Entregue', CANCELLED: 'Cancelado' }

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function PainelPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [matrix, setMatrix] = useState<MatrixData | null>(null)
  const [sub, setSub] = useState<SubInfo | null>(null)
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [copied, setCopied] = useState(false)
  const [upgradingId, setUpgradingId] = useState<string | null>(null)
  const [pixCode, setPixCode] = useState<string | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')
  const [cpf, setCpf] = useState('')

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      router.replace('/cadastro')
      return
    }
    setChecked(true)

    fetch(`${API}/auth/me`, { headers: authHeaders() }).then(r => r.json()).then(setMe).catch(() => {})
    fetch(`${API}/subscriptions/me`, { headers: authHeaders() }).then(r => r.json()).then(setSub).catch(() => {})
    fetch(`${API}/subscriptions/plans`).then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${API}/orders?limit=10`, { headers: authHeaders() }).then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})
  }, [router])

  useEffect(() => {
    if (!me?.id) return
    fetch(`${API}/affiliates/${me.id}/matrix`, { headers: authHeaders() }).then(r => r.json()).then(setMatrix).catch(() => {})
  }, [me?.id])

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    router.push('/cadastro')
  }

  function copyLink() {
    if (!matrix?.referralLink) return
    navigator.clipboard.writeText(matrix.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyPix() {
    if (!pixCode) return
    navigator.clipboard.writeText(pixCode)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  async function handleUpgrade(planId: string) {
    const cpfDigits = cpf.replace(/\D/g, '')
    if (!me?.cpf && cpfDigits.length !== 11) {
      setUpgradeError('Informe um CPF válido pra gerar a cobrança PIX.')
      return
    }
    setUpgradeError('')
    setPixCode(null)
    setUpgradingId(planId)
    try {
      const res = await fetch(`${API}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ planId, cpf: me?.cpf ? undefined : cpfDigits }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível assinar.')
      if (data?.pixQrCode) setPixCode(data.pixQrCode)
    } catch (err: any) {
      setUpgradeError(err.message ?? 'Erro ao assinar.')
    } finally {
      setUpgradingId(null)
    }
  }

  if (!checked) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        .pnl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
        .pnl-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: 'var(--navy)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src="/logo-dark.png" alt="Gás Pago" style={{ height: 26 }} />
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          <LogOut size={14} /> Sair
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px' }}>
        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>
              {me?.name || 'Meu painel'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>{me?.phone}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {me && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[me.affiliateStatus], background: `${STATUS_COLOR[me.affiliateStatus]}18`, padding: '4px 10px', borderRadius: 20 }}>
                {STATUS_LABEL[me.affiliateStatus]}
              </span>
            )}
            {sub && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--flame)', background: 'rgba(255,101,36,.1)', padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                {sub.plan !== 'FREE' && <Star size={10} fill="var(--flame)" />} {sub.plan === 'FREE' ? 'Free' : sub.plan}
              </span>
            )}
          </div>
        </div>

        <div className="pnl-grid" style={{ marginBottom: 16 }}>
          {/* Wallet */}
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

          {/* Referral link + lineage */}
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

        {/* Network levels */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
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

        <div className="pnl-grid">
          {/* Plan / upgrade */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Star size={16} color="var(--flame)" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Plano</span>
            </div>
            {sub?.plan && sub.plan !== 'FREE' ? (
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{sub.plan}</div>
                {sub.expiresAt && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Renova em {new Date(sub.expiresAt).toLocaleDateString('pt-BR')}</div>}
              </div>
            ) : plans.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum plano disponível no momento.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {me && !me.cpf && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sub)', display: 'block', marginBottom: 4 }}>CPF (necessário pra gerar o PIX)</label>
                    <input
                      value={cpf}
                      onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="000.000.000-00"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }}
                    />
                  </div>
                )}
                {plans.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-lt)' }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{p.billingCycle === 'YEARLY' ? 'ano' : 'mês'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={upgradingId === p.id}
                      style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', opacity: upgradingId === p.id ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {upgradingId === p.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                      Assinar
                    </button>
                  </div>
                ))}
                {upgradeError && <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{upgradeError}</div>}
                {pixCode && (
                  <div style={{ marginTop: 4, padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-lt)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Código PIX (copia e cola)</div>
                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'var(--sub)', wordBreak: 'break-all', marginBottom: 8 }}>{pixCode}</div>
                    <button onClick={copyPix} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: pixCopied ? 'var(--green)' : 'var(--flame)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      {pixCopied ? <Check size={12} /> : <Copy size={12} />} {pixCopied ? 'Copiado!' : 'Copiar código PIX'}
                    </button>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>Assinatura criada — aguarde a confirmação do pagamento.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ShoppingBag size={16} color="var(--flame)" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Pedidos recentes</span>
            </div>
            {orders.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum pedido ainda.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-lt)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{o.distributor?.name ?? '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{new Date(o.createdAt).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>R$ {Number(o.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
