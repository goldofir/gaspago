'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import GoogleSignInButton from '../_components/GoogleSignInButton'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type Step = 'phone' | 'otp' | 'done'

function formatBRPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function CadastroForm() {
  const params = useSearchParams()
  const ref = params.get('ref') ?? undefined

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [referralCode, setReferralCode] = useState('')

  const rawPhone = phone.replace(/\D/g, '')
  const fullPhone = `55${rawPhone}`

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault()
    if (rawPhone.length !== 11) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível enviar o código.')
      setStep('otp')
    } catch (err: any) {
      setError(err.message ?? 'Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 4) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, code, ref }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Código inválido ou expirado.')
      localStorage.setItem(TOKEN_KEY, data.access_token)
      setReferralCode(data.user?.referral_code ?? '')
      setStep('done')
    } catch (err: any) {
      setError(err.message ?? 'Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleSuccess(data: { token: string; role: string; user?: { referral_code?: string } }) {
    localStorage.setItem(TOKEN_KEY, data.token)
    setReferralCode((data as any).user?.referral_code ?? '')
    setStep('done')
  }

  return (
    <div className="cad-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .cad-body { font-family: 'Inter', sans-serif; background: #0A1628; min-height: 100vh; padding: 48px 16px; display: flex; align-items: center; justify-content: center; }
        .cad-wrap { width: 100%; max-width: 420px; }
        .cad-brand { display: flex; justify-content: center; margin-bottom: 24px; }
        .cad-logo { height: 40px; width: auto; }
        .cad-card { background: #fff; border-radius: 20px; padding: 36px; box-shadow: 0 8px 32px rgba(0,0,0,.16); }
        .cad-title { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; color: #0F2040; margin-bottom: 6px; }
        .cad-desc { font-size: 13.5px; color: #475569; margin-bottom: 24px; line-height: 1.55; }
        .cad-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
        .cad-label { font-size: 13px; font-weight: 500; color: #0F2040; }
        .cad-row { display: flex; align-items: center; border: 1.5px solid #E2E8F0; border-radius: 10px; overflow: hidden; }
        .cad-prefix { padding: 10px 12px; background: #F4F6FA; font-size: 14px; font-weight: 600; color: #0F2040; border-right: 1.5px solid #E2E8F0; }
        .cad-input { flex: 1; padding: 10px 14px; border: none; font-size: 14px; font-family: 'Inter'; color: #0F2040; outline: none; }
        .cad-input-plain { width: 100%; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 14px; font-family: 'Inter'; color: #0F2040; outline: none; text-align: center; letter-spacing: .3em; font-weight: 700; }
        .cad-error { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.18); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #EF4444; font-weight: 500; margin-bottom: 16px; }
        .cad-submit { width: 100%; padding: 13px; background: #FF6524; color: #fff; border: none; border-radius: 10px; font-family: 'Sora'; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; transition: transform .1s; }
        .cad-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .cad-submit:disabled { opacity: .7; cursor: not-allowed; }
        .cad-spin { animation: cad-spin .75s linear infinite; }
        @keyframes cad-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .cad-divider { display: flex; align-items: center; gap: 10px; margin: 18px 0 16px; }
        .cad-divider-line { flex: 1; height: 1px; background: #E2E8F0; }
        .cad-divider-text { font-size: 12px; color: #94A3B8; }
        .cad-back { display: inline-block; margin-top: 20px; color: #FF6524; font-weight: 600; font-size: 13.5px; text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; }
        .cad-done { text-align: center; padding: 8px 0; }
        .cad-done-icon { color: #10B981; margin-bottom: 14px; }
        .cad-refcode { background: #F4F6FA; border-radius: 10px; padding: 12px; margin: 16px 0; font-size: 13px; color: #475569; }
        .cad-refcode b { color: #0F2040; font-family: monospace; }
        @media (max-width: 420px) { .cad-card { padding: 26px 20px; } }
      `}</style>

      <div className="cad-wrap">
        <div className="cad-brand">
          <img src="/logo-dark.png" alt="Gás Pago" className="cad-logo" />
        </div>

        <div className="cad-card">
          {step === 'done' ? (
            <div className="cad-done">
              <CheckCircle2 size={48} className="cad-done-icon" />
              <h2 className="cad-title">Conta criada!</h2>
              <p className="cad-desc">Você já pode pedir gás e acompanhar seu saldo FGOL pelo app. Baixe o Gás Pago no seu celular pra continuar.</p>
              {referralCode && (
                <div className="cad-refcode">
                  Seu código de indicação: <b>{referralCode}</b><br />
                  Compartilhe pra ganhar comissão sobre o consumo de quem você indicar.
                </div>
              )}
              <a className="cad-back" href="/">← Voltar ao início</a>
            </div>
          ) : step === 'phone' ? (
            <>
              <h2 className="cad-title">Criar conta</h2>
              <p className="cad-desc">
                {ref ? 'Você foi indicado por um amigo — ' : ''}Digite seu celular pra receber um código de acesso. Se já tem conta, entra do mesmo jeito.
              </p>

              <form onSubmit={handleRequestCode}>
                <div className="cad-group">
                  <label className="cad-label">Celular</label>
                  <div className="cad-row">
                    <span className="cad-prefix">🇧🇷 +55</span>
                    <input
                      className="cad-input" placeholder="(11) 99999-9999" value={phone}
                      onChange={e => setPhone(formatBRPhone(e.target.value))}
                      inputMode="numeric" autoFocus required
                    />
                  </div>
                </div>

                {error && <div className="cad-error" role="alert">{error}</div>}

                <button type="submit" className="cad-submit" disabled={loading || rawPhone.length !== 11}>
                  {loading ? <><Loader2 size={16} className="cad-spin" /> Enviando…</> : 'Receber código'}
                </button>
              </form>

              <div className="cad-divider">
                <span className="cad-divider-line" />
                <span className="cad-divider-text">ou</span>
                <span className="cad-divider-line" />
              </div>

              <GoogleSignInButton portal="consumer" referralCode={ref} onSuccess={handleGoogleSuccess} onError={setError} />
            </>
          ) : (
            <>
              <h2 className="cad-title">Digite o código</h2>
              <p className="cad-desc">Enviamos um código por WhatsApp para +55 {phone}.</p>

              <form onSubmit={handleVerifyCode}>
                <div className="cad-group">
                  <input
                    className="cad-input-plain" placeholder="000000" value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric" maxLength={6} autoFocus required
                  />
                </div>

                {error && <div className="cad-error" role="alert">{error}</div>}

                <button type="submit" className="cad-submit" disabled={loading || code.length < 4}>
                  {loading ? <><Loader2 size={16} className="cad-spin" /> Verificando…</> : 'Confirmar'}
                </button>
              </form>

              <button className="cad-back" onClick={() => { setStep('phone'); setError('') }}>← Trocar número</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  )
}
