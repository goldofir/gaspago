'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Web3AuthConnect, { Web3AuthResult } from '../_components/Web3AuthConnect'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

const TOKEN_KEY_BY_TYPE = { DISTRIBUTOR: 'gp_distributor_token', ESTABLISHMENT: 'gp_pos_token' } as const

const CATEGORY_OPTIONS = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'farmacia', label: 'Farmácia' },
  { value: 'mercado', label: 'Mercado' },
  { value: 'beleza', label: 'Beleza & Estética' },
  { value: 'servico', label: 'Serviços em casa' },
  { value: 'pet', label: 'Pet' },
  { value: 'educacao', label: 'Educação' },
  { value: 'automotivo', label: 'Automotivo' },
]

type LeadType = 'DISTRIBUTOR' | 'ESTABLISHMENT'

function ParceiroForm() {
  const params = useSearchParams()
  const router = useRouter()
  const initialType: LeadType = params.get('tipo') === 'estabelecimento' ? 'ESTABLISHMENT' : 'DISTRIBUTOR'

  const [type, setType] = useState<LeadType>(initialType)
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [category, setCategory] = useState('restaurante')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [cnpjLoading, setCnpjLoading] = useState(false)


  // Runs right before opening the Web3Auth modal — no point making someone
  // connect a wallet only to then reject the form for a missing CNPJ.
  function validateForm(): boolean {
    setError('')
    if (!name.trim() || !phone.trim() || cnpj.replace(/\D/g, '').length !== 14) {
      setError('Preencha nome, telefone e um CNPJ válido (14 dígitos) antes de continuar.')
      return false
    }
    return true
  }

  async function handleWeb3AuthSuccess(result: Web3AuthResult) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`${API}/partner-leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          cnpj: cnpj.replace(/\D/g, ''),
          phone,
          email: email || result.email || undefined,
          city: city || undefined,
          state: state || undefined,
          category: type === 'ESTABLISHMENT' ? category : undefined,
          message: message || undefined,
          idToken: result.idToken,
          walletAddress: result.walletAddress,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error ?? 'Não foi possível enviar. Tente novamente.')
      }
      localStorage.setItem(TOKEN_KEY_BY_TYPE[type], data.token)
      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Erro ao conectar com o servidor.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pcr-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .pcr-body { font-family: 'Inter', sans-serif; background: #0A1628; min-height: 100vh; padding: 48px 16px; display: flex; align-items: center; justify-content: center; }
        .pcr-wrap { width: 100%; max-width: 480px; }
        .pcr-brand { display: flex; justify-content: center; margin-bottom: 24px; }
        .pcr-logo { height: 40px; width: auto; }
        .pcr-card { background: #fff; border-radius: 20px; padding: 36px; box-shadow: 0 8px 32px rgba(0,0,0,.16); }
        .pcr-title { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; color: #0F2040; margin-bottom: 6px; }
        .pcr-desc { font-size: 13.5px; color: #475569; margin-bottom: 24px; line-height: 1.55; }
        .pcr-toggle { display: flex; gap: 8px; margin-bottom: 24px; background: #F4F6FA; padding: 4px; border-radius: 12px; }
        .pcr-toggle button { flex: 1; padding: 9px; border: none; border-radius: 9px; background: transparent; font-family: 'Inter'; font-weight: 600; font-size: 13px; color: #64748B; cursor: pointer; transition: all .15s; }
        .pcr-toggle button.active { background: #FF6524; color: #fff; }
        .pcr-row { display: flex; gap: 12px; }
        .pcr-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; flex: 1; min-width: 0; }
        .pcr-label { font-size: 13px; font-weight: 500; color: #0F2040; }
        .pcr-input, .pcr-select, .pcr-textarea { width: 100%; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px; font-size: 14px; font-family: 'Inter'; color: #0F2040; outline: none; transition: border-color .15s; background: #fff; }
        .pcr-input:focus, .pcr-select:focus, .pcr-textarea:focus { border-color: #FF6524; }
        .pcr-textarea { resize: vertical; min-height: 70px; }
        .pcr-error { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.18); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #EF4444; font-weight: 500; margin-bottom: 16px; }
        .pcr-submit { width: 100%; padding: 13px; background: #FF6524; color: #fff; border: none; border-radius: 10px; font-family: 'Sora'; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 4px; transition: transform .1s; }
        .pcr-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .pcr-submit:disabled { opacity: .7; cursor: not-allowed; }
        .pcr-spin { animation: pcr-spin .75s linear infinite; }
        @keyframes pcr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pcr-done { text-align: center; padding: 20px 0; }
        .pcr-done-icon { color: #10B981; margin-bottom: 14px; }
        .pcr-back { display: inline-block; margin-top: 20px; color: #FF6524; font-weight: 600; font-size: 13.5px; text-decoration: none; }
        @media (max-width: 420px) { .pcr-card { padding: 26px 20px; } .pcr-row { flex-direction: column; gap: 0; } }
      `}</style>

      <div className="pcr-wrap">
        <div className="pcr-brand">
          <img src="/logo-dark.png" alt="Gás Pago" className="pcr-logo" />
        </div>

        <div className="pcr-card">
          {done ? (
            <div className="pcr-done">
              <CheckCircle2 size={48} className="pcr-done-icon" />
              <h2 className="pcr-title">Cadastro em análise!</h2>
              <p className="pcr-desc">Sua carteira já foi criada e você está logado. Assim que aprovarmos seus dados, seu painel libera automaticamente — você pode voltar aqui e entrar a qualquer momento.</p>
              <a className="pcr-back" href="/">← Voltar ao início</a>
            </div>
          ) : (
            <>
              <h2 className="pcr-title">Quero ser parceiro</h2>
              <p className="pcr-desc">Preencha seus dados e conecte com Google ou e-mail — sua carteira é criada na hora, sem senha pra guardar.</p>

              <div className="pcr-toggle">
                <button type="button" className={type === 'DISTRIBUTOR' ? 'active' : ''} onClick={() => setType('DISTRIBUTOR')}>Sou distribuidora</button>
                <button type="button" className={type === 'ESTABLISHMENT' ? 'active' : ''} onClick={() => setType('ESTABLISHMENT')}>Quero anunciar</button>
              </div>

              <div>
                <div className="pcr-group">
                  <label className="pcr-label">Nome da empresa</label>
                  <input className="pcr-input" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                </div>

                {type === 'ESTABLISHMENT' && (
                  <div className="pcr-group">
                    <label className="pcr-label">Segmento</label>
                    <select className="pcr-select" value={category} onChange={e => setCategory(e.target.value)}>
                      {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                )}

                <div className="pcr-row">
                  <div className="pcr-group">
                    <label className="pcr-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>CNPJ</span>
                      {cnpjLoading && <span style={{ fontSize: 11, color: '#FF6524', fontWeight: 600 }}>Buscando dados...</span>}
                    </label>
                    <input
                      className="pcr-input"
                      value={cnpj}
                      onChange={async (e) => {
                        const val = e.target.value
                        setCnpj(val)
                        const clean = val.replace(/\D/g, '')
                        if (clean.length === 14 && !cnpjLoading) {
                          setCnpjLoading(true)
                          try {
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'}/public-cnpj/${clean}`)
                            if (res.ok) {
                              const data = await res.json()
                              if (data.razaoSocial && !name) setName(data.razaoSocial)
                              if (data.endereco?.municipio) setCity(data.endereco.municipio)
                              if (data.endereco?.uf) setState(data.endereco.uf)
                            }
                          } catch (err) {
                            console.error(err)
                          } finally {
                            setCnpjLoading(false)
                          }
                        }
                      }}
                      required
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="pcr-group">
                    <label className="pcr-label">Telefone</label>
                    <input className="pcr-input" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(11) 99999-9999" />
                  </div>
                </div>


                <div className="pcr-group">
                  <label className="pcr-label">E-mail</label>
                  <input className="pcr-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Opcional — pode vir do login" />
                </div>

                <div className="pcr-row">
                  <div className="pcr-group">
                    <label className="pcr-label">Cidade</label>
                    <input className="pcr-input" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="pcr-group" style={{ maxWidth: 100 }}>
                    <label className="pcr-label">UF</label>
                    <input className="pcr-input" value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
                  </div>
                </div>

                <div className="pcr-group">
                  <label className="pcr-label">Mensagem (opcional)</label>
                  <textarea className="pcr-textarea" value={message} onChange={e => setMessage(e.target.value)} placeholder="Conte um pouco sobre seu negócio" />
                </div>

                {error && <div className="pcr-error" role="alert">{error}</div>}

                {submitting ? (
                  <button type="button" className="pcr-submit" disabled>
                    <Loader2 size={16} className="pcr-spin" /> Enviando…
                  </button>
                ) : (
                  <Web3AuthConnect
                    label="Continuar e criar carteira"
                    beforeConnect={validateForm}
                    onSuccess={handleWeb3AuthSuccess}
                    onError={setError}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ParceiroPage() {
  return (
    <Suspense fallback={null}>
      <ParceiroForm />
    </Suspense>
  )
}
