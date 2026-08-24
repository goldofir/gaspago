'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Loader2 } from 'lucide-react'
import Web3AuthConnect, { Web3AuthResult } from '../../_components/Web3AuthConnect'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

const ROLE_META: Record<string, { redirect: string; tokenKey: string }> = {
  DISTRIBUTOR: { redirect: '/distributor', tokenKey: 'gp_distributor_token' },
  ESTABLISHMENT: { redirect: '/pos', tokenKey: 'gp_pos_token' },
}

export default function PendingApprovalPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  // portalStatus at signup time is frozen into the JWT — the only way to see
  // a fresh value is to log in again, which always reads the current DB row.
  async function handleRecheck(result: Web3AuthResult) {
    setChecking(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/web3auth-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: result.idToken, walletAddress: result.walletAddress }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Não foi possível verificar.')
        return
      }
      if (data.portalStatus === 'ACTIVE') {
        const target = ROLE_META[data.role]
        if (target) {
          localStorage.setItem(target.tokenKey, data.token)
          router.push(target.redirect)
          return
        }
      }
      if (data.portalStatus === 'REJECTED') {
        setError('Seu cadastro foi recusado. Entre em contato com o suporte para mais informações.')
        return
      }
      setError('Ainda em análise — tente novamente mais tarde.')
    } catch {
      setError('Erro ao conectar com o servidor.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="pnd-body">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .pnd-body { font-family: 'Inter', sans-serif; background: #0A1628; min-height: 100vh; padding: 48px 16px; display: flex; align-items: center; justify-content: center; }
        .pnd-wrap { width: 100%; max-width: 440px; text-align: center; }
        .pnd-brand { display: flex; justify-content: center; margin-bottom: 24px; }
        .pnd-logo { height: 40px; width: auto; }
        .pnd-card { background: #fff; border-radius: 20px; padding: 40px 36px; box-shadow: 0 8px 32px rgba(0,0,0,.16); }
        .pnd-icon { color: #F59E0B; margin-bottom: 16px; }
        .pnd-title { font-family: 'Sora', sans-serif; font-weight: 800; font-size: 22px; color: #0F2040; margin-bottom: 10px; }
        .pnd-desc { font-size: 13.5px; color: #475569; margin-bottom: 24px; line-height: 1.6; }
        .pnd-error { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.18); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #EF4444; font-weight: 500; margin-bottom: 16px; }
        .pnd-back { display: inline-block; margin-top: 18px; color: #FF6524; font-weight: 600; font-size: 13.5px; text-decoration: none; }
        .pnd-spin { animation: pnd-spin .75s linear infinite; }
        @keyframes pnd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="pnd-wrap">
        <div className="pnd-brand">
          <img src="/logo-dark.png" alt="Gás Pago" className="pnd-logo" />
        </div>

        <div className="pnd-card">
          <Clock3 size={44} className="pnd-icon" />
          <h1 className="pnd-title">Cadastro em análise</h1>
          <p className="pnd-desc">Seu cadastro e sua carteira já foram criados. Assim que nosso time aprovar seus dados, seu painel libera automaticamente. Entre novamente pra checar se já foi liberado.</p>

          {error && <div className="pnd-error" role="alert">{error}</div>}

          {checking ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', color: '#475569', fontSize: 13.5 }}>
              <Loader2 size={16} className="pnd-spin" /> Verificando…
            </div>
          ) : (
            <Web3AuthConnect label="Verificar status" onSuccess={handleRecheck} onError={setError} />
          )}

          <a className="pnd-back" href="/">← Voltar ao início</a>
        </div>
      </div>
    </div>
  )
}
