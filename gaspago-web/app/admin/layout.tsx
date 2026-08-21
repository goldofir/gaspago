'use client'
import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, KeyRound, Mail, HardDrive,
  Network, TrendingUp, ShoppingBag, ChevronRight, Flame, Menu, X, Truck, CreditCard, LogOut,
} from 'lucide-react'
import { adminLogout } from '../_components/adminFetch'

const nav = [
  { href: '/admin',             label: 'Dashboard',   Icon: LayoutDashboard },
  { href: '/admin/credentials', label: 'Credenciais', Icon: KeyRound },
  { href: '/admin/email',       label: 'E-mail',      Icon: Mail },
  { href: '/admin/storage',     label: 'Storage',     Icon: HardDrive },
  { href: '/admin/orders',        label: 'Pedidos',       Icon: ShoppingBag },
  { href: '/admin/distributors',  label: 'Distribuidoras', Icon: Truck },
  { href: '/admin/affiliates',    label: 'Afiliados',     Icon: Network },
  { href: '/admin/revenue',        label: 'Receita',      Icon: TrendingUp },
  { href: '/admin/subscriptions',  label: 'Assinaturas',  Icon: CreditCard },
]

function NavItems({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <>
      {nav.map(({ href, label, Icon }) => {
        const exact = href === '/admin'
        const active = exact ? path === href : (path?.startsWith(href) ?? false)
        return (
          <Link key={href} href={href} onClick={onNavigate} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 10px', borderRadius: 8, marginBottom: 2,
            color: active ? '#fff' : 'rgba(255,255,255,.55)',
            background: active ? 'rgba(255,101,36,.14)' : 'transparent',
            fontSize: 13.5, fontWeight: active ? 600 : 400,
            transition: 'all .15s', textDecoration: 'none',
            borderLeft: active ? '2px solid var(--flame)' : '2px solid transparent',
          }}>
            <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
            {label}
            {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: .5 }} />}
          </Link>
        )
      })}
    </>
  )
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('gp_admin_token')
    if (!token) {
      router.replace('/login')
      return
    }
    setChecked(true)
  }, [router])

  if (!checked) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ground)' }}>
      <style>{`
        /* ─── Responsive admin shell ─────────────────────────── */
        .admin-sidebar {
          width: 248px;
          background: var(--navy);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0; bottom: 0;
          z-index: 50;
          border-right: 1px solid rgba(255,255,255,.05);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .admin-topbar { display: none; }
        .admin-main   { margin-left: 248px; flex: 1; padding: 36px 40px; min-height: 100vh; }
        .admin-overlay { display: none; }

        @media (max-width: 767px) {
          .admin-sidebar {
            transform: translateX(-100%);
            box-shadow: 4px 0 32px rgba(0,0,0,.35);
            width: 280px;
          }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: 56px;
            background: var(--navy);
            border-bottom: 1px solid rgba(255,255,255,.07);
            padding: 0 16px;
            z-index: 49;
          }
          .admin-main  { margin-left: 0; padding: 72px 16px 32px; }
          .admin-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.5);
            backdrop-filter: blur(2px);
            z-index: 48;
            opacity: 0;
            pointer-events: none;
            transition: opacity .25s;
          }
          .admin-overlay.open { opacity: 1; pointer-events: auto; }
        }
      `}</style>

      {/* Overlay (mobile) */}
      <div className={`admin-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      {/* Mobile top bar */}
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #FF6524 0%, #F2B825 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Flame size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: '-.01em' }}>
            GÁS<span style={{ color: 'var(--flame)' }}>PAGO</span>
          </span>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{
          background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 8, color: '#fff', cursor: 'pointer',
          padding: '6px 8px', display: 'flex', alignItems: 'center',
        }}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>

        {/* Brand */}
        <div style={{ padding: '22px 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #FF6524 0%, #F2B825 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Flame size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-.01em' }}>
              GÁS<span style={{ color: 'var(--flame)' }}>PAGO</span>
            </div>
          </div>
          <div style={{
            marginTop: 10, padding: '4px 8px', borderRadius: 5,
            background: 'rgba(255,101,36,.12)', border: '1px solid rgba(255,101,36,.2)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--flame)' }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              SuperAdmin
            </span>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '0 16px' }} />

        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '8px 10px 6px' }}>
            Plataforma
          </p>
          <NavItems path={path} onNavigate={() => setOpen(false)} />
        </nav>

        <div style={{ padding: '10px 10px 14px' }}>
          <button
            onClick={adminLogout}
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

        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.8 }}>
            FGOL · Polygon PoS<br />
            <span style={{ color: 'rgba(255,255,255,.15)' }}>0xa1B779…C6D7</span>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}
