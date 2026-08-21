'use client'
import { useState, useEffect, useRef } from 'react'
import { QrCode, RefreshCw, CheckCircle2 } from 'lucide-react'
import { portalFetch } from '../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_pos_token'

type Step = 'keypad' | 'qr' | 'success'
type ChargeResponse = { id: string; qrToken: string; qrCode: string; expiresAt: string }
type StatusResponse = { status: string; fgolUsed: number; pixAmount: number; cashbackAmount: number }

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫']

export default function PosPage() {
  const [step, setStep] = useState<Step>('keypad')
  const [amount, setAmount] = useState('0')
  const [charge, setCharge] = useState<ChargeResponse | null>(null)
  const [paymentResult, setPaymentResult] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(300)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function handleKey(k: string) {
    setAmount(prev => {
      if (k === '⌫') return prev.length <= 1 ? '0' : prev.slice(0, -1)
      if (k === ',' && prev.includes(',')) return prev
      if (prev === '0' && k !== ',') return k
      const next = prev + k
      // max 2 decimals
      const parts = next.split(',')
      if (parts[1]?.length > 2) return prev
      return next
    })
  }

  async function generateCharge() {
    const value = parseFloat(amount.replace(',', '.'))
    if (!value || value <= 0) return
    setLoading(true)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/pos/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value }),
      })
      const data: ChargeResponse = await res.json()
      setCharge(data)
      setSecondsLeft(300)
      setStep('qr')
      startPolling(data.id)
      startTimer()
    } finally {
      setLoading(false)
    }
  }

  function startPolling(chargeId: string) {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await portalFetch(TOKEN_KEY, `${API}/pos/charge/${chargeId}/status`)
        const data: StatusResponse = await res.json()
        if (data.status === 'PAID') {
          stopAll()
          setPaymentResult(data)
          setStep('success')
        } else if (data.status === 'EXPIRED' || data.status === 'CANCELLED') {
          stopAll()
          reset()
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { stopAll(); reset(); return 0 }
        return s - 1
      })
    }, 1000)
  }

  function stopAll() {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function reset() {
    stopAll()
    setStep('keypad')
    setAmount('0')
    setCharge(null)
    setPaymentResult(null)
    setSecondsLeft(300)
  }

  useEffect(() => () => stopAll(), [])

  const displayAmount = `R$ ${amount.includes(',') ? amount : `${amount},00`}`
  const min = Math.floor(secondsLeft / 60)
  const sec = String(secondsLeft % 60).padStart(2, '0')

  if (step === 'keypad') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Balcão POS</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Nova Cobrança</h1>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px 28px', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', marginBottom: 32, fontVariantNumeric: 'tabular-nums' }}>
            {displayAmount}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
            {KEYPAD.map(k => (
              <button key={k} onClick={() => handleKey(k)} style={{
                padding: '18px 0', borderRadius: 12, fontSize: k === '⌫' ? 20 : 22, fontWeight: 700,
                background: k === '⌫' ? 'var(--ground)' : 'var(--surface-2, var(--ground))',
                border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer',
                transition: 'all .1s', boxShadow: 'var(--shadow-sm)',
              }}>
                {k}
              </button>
            ))}
          </div>

          <button onClick={generateCharge} disabled={loading || amount === '0'} style={{
            width: '100%', padding: '16px', borderRadius: 14, fontSize: 16, fontWeight: 800,
            background: 'var(--flame)', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: amount === '0' ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <QrCode size={18} />
            {loading ? 'Gerando…' : 'Gerar QR Code'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'qr' && charge) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Aguardando pagamento</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>O cliente deve escanear com o app Gás Pago</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px', boxShadow: 'var(--shadow)' }}>
          {/* QR Code image */}
          {charge.qrCode ? (
            <img src={`data:image/png;base64,${charge.qrCode}`} alt="QR Code" style={{ width: 260, height: 260, borderRadius: 12, display: 'block', margin: '0 auto 20px' }} />
          ) : (
            <div style={{ width: 260, height: 260, background: 'var(--ground)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <QrCode size={80} color="var(--muted)" />
            </div>
          )}

          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{displayAmount}</div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: secondsLeft < 60 ? '#EF444418' : '#3B82F618', marginBottom: 20 }}>
            <RefreshCw size={12} color={secondsLeft < 60 ? '#EF4444' : '#3B82F6'} />
            <span style={{ fontSize: 13, fontWeight: 700, color: secondsLeft < 60 ? '#EF4444' : '#3B82F6' }}>Expira em {min}:{sec}</span>
          </div>

          <button onClick={reset} style={{ width: '100%', padding: '12px', borderRadius: 12, background: 'var(--ground)', border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (step === 'success' && paymentResult) {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '40px 32px', boxShadow: 'var(--shadow)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#10B98118', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={32} color="#10B981" />
          </div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#10B981', marginBottom: 8 }}>Pagamento recebido!</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Transação processada com sucesso</p>

          <div style={{ background: 'var(--ground)', borderRadius: 12, padding: '16px', marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Valor Total', displayAmount],
              ['FGOL usado pelo cliente', `${paymentResult.fgolUsed?.toFixed(4) ?? '0'} FGOL`],
              ['Recebido via PIX', `R$ ${paymentResult.pixAmount?.toFixed(2) ?? '0,00'}`],
              ['Cashback concedido', `${paymentResult.cashbackAmount?.toFixed(4) ?? '0'} FGOL`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-lt, var(--border))' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>

          <button onClick={reset} style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Nova Cobrança
          </button>
        </div>
      </div>
    )
  }

  return null
}
