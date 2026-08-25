'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Star, MapPin, Plus, Minus, ShoppingCart, Loader2, Copy, Check } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type Item = { id: string; name: string; description: string | null; price: number | string; cashbackPercentOverride: number | null }
type Establishment = {
  id: string; name: string; description: string | null; category: string; city: string; state: string
  rating: number; cashbackPercent: number; marketplaceItems: Item[]
}
type CheckoutResult = {
  posPaymentId: string; establishmentName: string; totalAmount: number; fgolUsed: number
  pixAmount: number; pixQrCode?: string; pixPayload?: string; status?: string; cashbackEarned: number
}

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function EstablishmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [est, setEst] = useState<Establishment | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cpf, setCpf] = useState('')
  const [meCpf, setMeCpf] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [result, setResult] = useState<CheckoutResult | null>(null)
  const [pixCopied, setPixCopied] = useState(false)

  useEffect(() => {
    fetch(`${API}/marketplace/establishments/${id}`).then(r => r.json()).then(setEst).catch(() => {})
    fetch(`${API}/auth/me`, { headers: authHeaders() }).then(r => r.json()).then(d => setMeCpf(d?.cpf ?? null)).catch(() => {})
  }, [id])

  function updateQty(itemId: string, delta: number) {
    setCart(c => {
      const next = Math.max(0, (c[itemId] ?? 0) + delta)
      const copy = { ...c }
      if (next === 0) delete copy[itemId]
      else copy[itemId] = next
      return copy
    })
  }

  const items = est?.marketplaceItems ?? []
  const total = items.reduce((sum, it) => sum + (cart[it.id] ?? 0) * Number(it.price), 0)
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  async function handleCheckout() {
    setCheckoutError('')
    const cpfDigits = cpf.replace(/\D/g, '')
    if (!meCpf && cpfDigits.length !== 11) {
      setCheckoutError('Informe um CPF válido pra gerar a cobrança PIX.')
      return
    }
    setCheckingOut(true)
    try {
      const res = await fetch(`${API}/marketplace/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          establishmentId: id,
          items: Object.entries(cart).map(([itemId, quantity]) => ({ itemId, quantity })),
          cpf: meCpf ? undefined : cpfDigits,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível concluir a compra.')
      setResult(data)
      setCart({})
    } catch (err: any) {
      setCheckoutError(err.message ?? 'Erro ao finalizar compra.')
    } finally {
      setCheckingOut(false)
    }
  }

  function copyPix() {
    if (!result?.pixPayload) return
    navigator.clipboard.writeText(result.pixPayload)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  if (!est) return <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>

  if (result) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)', maxWidth: 480 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Sora',sans-serif", marginBottom: 8 }}>
            {result.pixAmount === 0 ? 'Compra concluída!' : 'Quase lá!'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 16 }}>{result.establishmentName}</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Sora',sans-serif", marginBottom: 4 }}>
            R$ {result.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--green)', marginBottom: 16 }}>+{result.cashbackEarned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} FGOL de cashback</div>

          {result.pixAmount > 0 && result.pixPayload && (
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-lt)', textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Código PIX (copia e cola) — R$ {result.pixAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'var(--sub)', wordBreak: 'break-all', marginBottom: 8 }}>{result.pixPayload}</div>
              <button onClick={copyPix} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: pixCopied ? 'var(--green)' : 'var(--flame)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                {pixCopied ? <Check size={12} /> : <Copy size={12} />} {pixCopied ? 'Copiado!' : 'Copiar código PIX'}
              </button>
            </div>
          )}

          <button onClick={() => router.push('/painel/faturas')} style={{ marginTop: 18, padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Ver em Faturas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <button onClick={() => router.push('/painel/marketplace')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--sub)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ChevronLeft size={15} /> Voltar
      </button>

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>{est.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, fontSize: 12.5, color: 'var(--sub)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {est.city}/{est.state}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber)' }}><Star size={12} fill="var(--amber)" /> {est.rating.toFixed(1)}</span>
        </div>
        {est.description && <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 10 }}>{est.description}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cartCount > 0 ? '1fr 300px' : '1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum item disponível.</div>
          ) : items.map(it => (
            <div key={it.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{it.name}</div>
                {it.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{it.description}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--flame)', marginTop: 6, fontFamily: "'JetBrains Mono',monospace" }}>
                  R$ {Number(it.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={() => updateQty(it.id, -1)} disabled={!cart[it.id]} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: cart[it.id] ? 'pointer' : 'not-allowed', opacity: cart[it.id] ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Minus size={12} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, width: 18, textAlign: 'center' }}>{cart[it.id] ?? 0}</span>
                <button onClick={() => updateQty(it.id, 1)} style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'var(--flame)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {cartCount > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ShoppingCart size={15} color="var(--flame)" />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase' }}>Seu pedido</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Sora',sans-serif", marginBottom: 4 }}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</div>

            {!meCpf && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--sub)', display: 'block', marginBottom: 4 }}>CPF (necessário pra gerar o PIX)</label>
                <input value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="000.000.000-00" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} />
              </div>
            )}

            {checkoutError && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 10 }}>{checkoutError}</div>}

            <button onClick={handleCheckout} disabled={checkingOut} style={{ width: '100%', padding: '11px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', opacity: checkingOut ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {checkingOut ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null} Finalizar compra
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
