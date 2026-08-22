'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import GoogleSignInButton from '../_components/GoogleSignInButton'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleGoogleSuccess(data: { token: string; role: string }) {
    localStorage.setItem('gp_admin_token', data.token)
    router.push('/admin')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/admin/auth/login`, {
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
      localStorage.setItem('gp_admin_token', data.token)
      router.push('/admin')
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

        :root {
          --flame: #FF6524;
          --navy: #0A1628;
          --gold: #F2B825;
          --ground: #F4F6FA;
          --surface: #FFF;
          --surface-2: #F8FAFC;
          --border: #E2E8F0;
          --border-lt: #EEF2F7;
          --text: #0F2040;
          --sub: #475569;
          --muted: #94A3B8;
          --green: #22C55E;
          --red: #EF4444;
          --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
          --shadow: 0 4px 16px rgba(0,0,0,.10);
          --shadow-md: 0 8px 32px rgba(0,0,0,.16);
          --flame-dim: rgba(255,101,36,.10);
        }

        body {
          font-family: 'Inter', sans-serif;
          background: var(--navy);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }

        .login-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
          gap: 28px;
        }

        .brand-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .brand-logo {
          height: 46px;
          width: auto;
          filter: drop-shadow(0 4px 20px rgba(255,101,36,.25));
        }

        .brand-subtitle {
          font-size: 11px;
          font-weight: 600;
          color: var(--flame);
          letter-spacing: .1em;
          text-transform: uppercase;
          margin-top: -6px;
        }

        .login-card {
          width: 100%;
          background: var(--surface);
          border-radius: 20px;
          padding: 36px;
          box-shadow: var(--shadow-md);
        }

        .card-title {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 20px;
          color: var(--text);
          margin-bottom: 6px;
        }

        .card-desc {
          font-size: 13px;
          color: var(--sub);
          margin-bottom: 28px;
          line-height: 1.5;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text);
        }

        .input-wrap {
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: var(--text);
          background: var(--surface);
          outline: none;
          transition: border-color .15s, box-shadow .15s;
        }

        .form-input:focus {
          border-color: var(--flame);
          box-shadow: 0 0 0 3px var(--flame-dim);
        }

        .form-input::placeholder { color: var(--muted); }

        .input-with-toggle { padding-right: 42px; }

        .eye-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          display: flex;
          align-items: center;
          padding: 2px;
          transition: color .15s;
        }

        .eye-toggle:hover { color: var(--sub); }

        .error-msg {
          background: rgba(239,68,68,.08);
          border: 1px solid rgba(239,68,68,.18);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: var(--red);
          font-weight: 500;
          margin-bottom: 18px;
        }

        .submit-btn {
          width: 100%;
          padding: 12px;
          background: var(--flame);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background .15s, transform .1s, box-shadow .15s;
          box-shadow: 0 2px 12px rgba(255,101,36,.30);
          margin-top: 4px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #e8551a;
          box-shadow: 0 4px 18px rgba(255,101,36,.40);
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) { transform: translateY(0); }

        .submit-btn:disabled {
          opacity: .7;
          cursor: not-allowed;
        }

        .spin {
          animation: spin .75s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .footer-note {
          font-size: 11.5px;
          color: rgba(255,255,255,.22);
          text-align: center;
          margin-top: 4px;
        }

        @media (max-width: 420px) {
          .login-card { padding: 28px 20px; }
        }
      `}</style>

      <div className="login-wrapper">
        {/* Brand block */}
        <div className="brand-block">
          <img src="/logo-dark.png" alt="Gás Pago" className="brand-logo" />
          <div style={{ textAlign: 'center' }}>
            <div className="brand-subtitle">Painel SuperAdmin</div>
          </div>
        </div>

        {/* Card */}
        <div className="login-card">
          <h2 className="card-title">Acesso restrito</h2>
          <p className="card-desc">Entre com suas credenciais de administrador</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@gaspago.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Senha</label>
              <div className="input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input input-with-toggle"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="eye-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword
                    ? <EyeOff size={16} strokeWidth={2} />
                    : <Eye size={16} strokeWidth={2} />
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="error-msg" role="alert">{error}</div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={16} className="spin" /> Entrando…</>
                : 'Entrar'
              }
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 16px' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>ou</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <GoogleSignInButton portal="admin" onSuccess={handleGoogleSuccess} onError={setError} />
        </div>

        <p className="footer-note">Gás Pago V3 · Acesso exclusivo para administradores</p>
      </div>
    </>
  )
}
