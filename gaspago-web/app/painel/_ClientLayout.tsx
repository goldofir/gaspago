'use client'
import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, UserCircle, Store, ShoppingBag, Receipt, Menu, X, ChevronRight, LogOut } from 'lucide-react'

const TOKEN_KEY = 'gp_consumer_token'

const nav = [
  { href: '/painel',             label: 'Dashboard',   Icon: LayoutDashboard },
  { href: '/painel/perfil',      label: 'Perfil & KYC', Icon: UserCircle },
  { href: '/painel/marketplace', label: 'Marketplace', Icon: Store },
  { href: '/painel/pedidos',     label: 'Pedidos',      Icon: ShoppingBag },
  { href: '/painel/faturas',     label: 'Faturas',      Icon: Receipt },
]

export default function PainelLayout({ children }: { children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      router.replace('/cadastro')
      return
    }
    setChecked(true)
  }, [router])

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    router.push('/cadastro')
  }

  if (!checked) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ground)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
        .pnl-sidebar {
          width: 232px; background: var(--navy);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 50; border-right: 1px solid rgba(255,255,255,.05);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .pnl-topbar { display: none; }
        .pnl-main   { margin-left: 232px; flex: 1; padding: 32px 32px; min-height: 100vh; box-sizing: border-box; max-width: calc(100vw - 232px); }
        .pnl-overlay { display: none; }
        @media (max-width: 767px) {
          .pnl-sidebar { transform: translateX(-100%); box-shadow: 4px 0 32px rgba(0,0,0,.35); width: 260px; }
          .pnl-sidebar.open { transform: translateX(0); }
          .pnl-topbar {
            display: flex; align-items: center; justify-content: space-between;
            position: fixed; top: 0; left: 0; right: 0; height: 56px;
            background: var(--navy); border-bottom: 1px solid rgba(255,255,255,.07);
            padding: 0 16px; z-index: 49;
          }
          .pnl-main  { margin-left: 0; padding: 72px 16px 32px; max-width: 100vw; }
          .pnl-overlay {
            display: block; position: fixed; inset: 0; background: rgba(0,0,0,.5);
            backdrop-filter: blur(2px); z-index: 48; opacity: 0;
            pointer-events: none; transition: opacity .25s;
          }
          .pnl-overlay.open { opacity: 1; pointer-events: auto; }
        }
      `}</style>

      <div className={`pnl-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <div className="pnl-topbar">
        <img src="/logo-dark.png" alt="Gás Pago" style={{ height: 22 }} />
        <button onClick={() => setOpen(o => !o)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <aside className={`pnl-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '22px 20px 18px' }}>
          <img src="/logo-dark.png" alt="Gás Pago" style={{ height: 26 }} />
          <div style={{ marginTop: 10, padding: '4px 8px', borderRadius: 5, background: 'rgba(255,101,36,.12)', border: '1px solid rgba(255,101,36,.2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--flame)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Afiliado</span>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '0 16px' }} />

        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '8px 10px 6px' }}>Meu painel</p>
          {nav.map(({ href, label, Icon }) => {
            const exact = href === '/painel'
            const active = exact ? path === href : (path?.startsWith(href) ?? false)
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                color: active ? '#fff' : 'rgba(255,255,255,.55)', background: active ? 'rgba(255,101,36,.14)' : 'transparent',
                fontSize: 13.5, fontWeight: active ? 600 : 400, transition: 'all .15s', textDecoration: 'none',
                borderLeft: active ? '2px solid var(--flame)' : '2px solid transparent',
              }}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {label}
                {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: .5 }} />}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '10px 10px 14px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'rgba(255,255,255,.55)',
              fontSize: 13.5, fontFamily: 'inherit', transition: 'all .15s', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.12)'; e.currentTarget.style.color = '#fca5a5' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,.55)' }}
          >
            <LogOut size={15} strokeWidth={1.8} />
            Sair
          </button>
        </div>
      </aside>

      <main className="pnl-main">{children}</main>
    </div>
  )
}
