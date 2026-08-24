'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import GoogleSignInButton from './GoogleSignInButton'
import Web3AuthConnect, { Web3AuthResult } from './Web3AuthConnect'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

export type PortalKind = 'distributor' | 'credenciador' | 'pos'

const PORTAL_META: Record<PortalKind, { label: string; accent: string; redirect: string; tokenKey: string; placeholder: string }> = {
  distributor:  { label: 'Painel da Distribuidora', accent: '#3B82F6', redirect: '/distributor',  tokenKey: 'gp_distributor_token',  placeholder: 'contato@distribuidora.com' },
  credenciador: { label: 'Painel do Credenciador',  accent: '#F59E0B', redirect: '/credenciador',  tokenKey: 'gp_credenciador_token', placeholder: 'voce@credenciador.com' },
  pos:          { label: 'Balcão / Estabelecimento', accent: '#10B981', redirect: '/pos',          tokenKey: 'gp_pos_token',          placeholder: 'caixa@estabelecimento.com' },
}

// Maps whatever role the backend actually returns to where that account belongs —
// used in unified mode (no `portal` prop), where the login itself decides the
// destination instead of the user having to pick the right URL beforehand.
const ROLE_META: Record<string, { redirect: string; tokenKey: string }> = {
  DISTRIBUTOR:   { redirect: '/distributor',  tokenKey: 'gp_distributor_token' },
  CREDENCIADOR:  { redirect: '/credenciador', tokenKey: 'gp_credenciador_token' },
  ESTABLISHMENT: { redirect: '/pos',          tokenKey: 'gp_pos_token' },
}

const UNIFIED_META = { label: 'Painel de Parceiros', accent: '#FF6524', redirect: '', tokenKey: '', placeholder: 'voce@empresa.com' }

export default function PortalLoginForm({ portal }: { portal?: PortalKind }) {
  const meta = portal ? PORTAL_META[portal] : UNIFIED_META
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function routeByRole(role: string, token: string, portalStatus?: string): boolean {
    const target = portal
      ? (() => {
          const expectedRole = ({ distributor: 'DISTRIBUTOR', credenciador: 'CREDENCIADOR', pos: 'ESTABLISHMENT' } as const)[portal]
          return role === expectedRole ? meta : null
        })()
      : ROLE_META[role]

    if (!target) {
      setError(portal ? 'Esta conta não tem acesso a este painel' : 'Esta conta não tem acesso a nenhum painel.')
      return false
    }

    localStorage.setItem(target.tokenKey, token)

    // Self-service signups (Web3Auth) start PENDING_APPROVAL — no
    // Distributor/Establishment exists yet, so the real portal pages would
    // just error fetching /me. Send them to the waiting screen instead.
    if (portalStatus === 'PENDING_APPROVAL') {
      router.push('/parceiro/pendente')
      return true
    }
    if (portalStatus === 'REJECTED') {
      setError('Seu cadastro foi recusado. Entre em contato com o suporte para mais informações.')
      return false
    }

    router.push(target.redirect)
    return true
  }

  function handleGoogleSuccess(data: { token: string; role: string }) {
    routeByRole(data.role, data.token)
  }

  function handleGoogleError(message: string) {
    setError(message)
  }

  async function handleWeb3AuthSuccess(result: Web3AuthResult) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/web3auth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: result.idToken, walletAddress: result.walletAddress }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Não foi possível entrar.')
        return
      }
      routeByRole(data.role, data.token, data.portalStatus)
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/auth/portal-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.status === 401) {
        setError('Credenciais inválidas')
        return
      }
      if (!res.ok) {
        setError('Erro ao conectar com o servidor')
        return
      }

      const data = await res.json()
      routeByRole(data.role, data.token)
    } catch {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .plf-body {
          font-family: 'Inter', sans-serif; background: #0A1628; min-height: 100vh;
          display: flex; align-items: center; justify-content: center; padding: 24px 16px;
        }
        .plf-wrap { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 420px; gap: 28px; }
        .plf-brand { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .plf-logo { height: 46px; width: auto; filter: drop-shadow(0 4px 20px rgba(255,101,36,.25)); }
        .plf-subtitle { font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; margin-top: -6px; }
        .plf-card { width: 100%; background: #fff; border-radius: 20px; padding: 36px; box-shadow: 0 8px 32px rgba(0,0,0,.16); }
        .plf-title { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 20px; color: #0F2040; margin-bottom: 6px; }
        .plf-desc { font-size: 13px; color: #475569; margin-bottom: 28px; line-height: 1.5; }
        .plf-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
        .plf-label { font-size: 13px; font-weight: 500; color: #0F2040; }
        .plf-input-wrap { position: relative; }
        .plf-input {
          width: 100%; padding: 10px 14px; border: 1.5px solid #E2E8F0; border-radius: 10px;
          font-size: 14px; font-family: 'Inter', sans-serif; color: #0F2040; background: #fff;
          outline: none; transition: border-color .15s, box-shadow .15s;
        }
        .plf-input:focus { border-color: ${meta.accent}; box-shadow: 0 0 0 3px ${meta.accent}22; }
        .plf-input::placeholder { color: #94A3B8; }
        .plf-input-toggle { padding-right: 42px; }
        .plf-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94A3B8;
          display: flex; align-items: center; padding: 2px;
        }
        .plf-error {
          background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.18); border-radius: 8px;
          padding: 10px 14px; font-size: 13px; color: #EF4444; font-weight: 500; margin-bottom: 18px;
        }
        .plf-submit {
          width: 100%; padding: 12px; background: ${meta.accent}; color: #fff; border: none; border-radius: 10px;
          font-family: 'Sora', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform .1s, box-shadow .15s; margin-top: 4px;
        }
        .plf-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .plf-submit:disabled { opacity: .7; cursor: not-allowed; }
        .plf-spin { animation: plf-spin .75s linear infinite; }
        @keyframes plf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .plf-divider { display: flex; align-items: center; gap: 10px; margin: 6px 0 16px; }
        .plf-divider-line { flex: 1; height: 1px; background: #E2E8F0; }
        .plf-divider-text { font-size: 12px; color: #94A3B8; }
        .plf-footer { font-size: 11.5px; color: rgba(255,255,255,.22); text-align: center; margin-top: 4px; }
        @media (max-width: 420px) { .plf-card { padding: 28px 20px; } }
      `}</style>

      <div className="plf-body">
        <div className="plf-wrap">
          <div className="plf-brand">
            <img src="/logo-dark.png" alt="Gás Pago" className="plf-logo" />
            <div style={{ textAlign: 'center' }}>
              <div className="plf-subtitle" style={{ color: meta.accent }}>{meta.label}</div>
            </div>
          </div>

          <div className="plf-card">
            <h2 className="plf-title">Acesso restrito</h2>
            <p className="plf-desc">Entre com as credenciais fornecidas pelo administrador.</p>

            <form onSubmit={handleSubmit}>
              <div className="plf-group">
                <label className="plf-label" htmlFor="email">E-mail</label>
                <input
                  id="email" type="email" className="plf-input" placeholder={meta.placeholder}
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" autoFocus
                />
              </div>

              <div className="plf-group">
                <label className="plf-label" htmlFor="password">Senha</label>
                <div className="plf-input-wrap">
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} className="plf-input plf-input-toggle"
                    placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password"
                  />
                  <button
                    type="button" className="plf-eye" onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              {error && <div className="plf-error" role="alert">{error}</div>}

              <button type="submit" className="plf-submit" disabled={loading}>
                {loading ? <><Loader2 size={16} className="plf-spin" /> Entrando…</> : 'Entrar'}
              </button>
            </form>

            <div className="plf-divider">
              <span className="plf-divider-line" />
              <span className="plf-divider-text">ou</span>
              <span className="plf-divider-line" />
            </div>

            <GoogleSignInButton portal={portal ?? 'business'} onSuccess={handleGoogleSuccess} onError={handleGoogleError} />

            <div style={{ marginTop: 10 }}>
              <Web3AuthConnect label="Entrar com carteira (Google/e-mail)" onSuccess={handleWeb3AuthSuccess} onError={setError} />
            </div>
          </div>

          <p className="plf-footer">Gás Pago V3 · Acesso restrito a contas autorizadas</p>
        </div>
      </div>
    </>
  )
}

export { PORTAL_META }
