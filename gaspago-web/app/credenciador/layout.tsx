'use client'
import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Truck, Store, TrendingUp, Flame, Menu, X, ChevronRight } from 'lucide-react'

const nav = [
  { href: '/credenciador',               label: 'Dashboard',       Icon: LayoutDashboard },
  { href: '/credenciador/distributors',  label: 'Distribuidoras',  Icon: Truck },
  { href: '/credenciador/establishments',label: 'Estabelecimentos', Icon: Store },
  { href: '/credenciador/commissions',   label: 'Minhas Comissões', Icon: TrendingUp },
]

export default function CredenciadorLayout({ children }: { children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)
  const isLoginPage = path === '/credenciador/login'

  useEffect(() => {
    if (isLoginPage) { setChecked(true); return }
    const token = localStorage.getItem('gp_credenciador_token')
    if (!token) {
      router.replace('/credenciador/login')
      return
    }
    setChecked(true)
  }, [isLoginPage, path, router])

  if (isLoginPage) return <>{children}</>
  if (!checked) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ground)' }}>
      <style>{`
        .cred-sidebar {
          width: 248px; background: var(--navy);
          display: flex; flex-direction: column;
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 50; border-right: 1px solid rgba(255,255,255,.05);
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .cred-topbar { display: none; }
        .cred-main   { margin-left: 248px; flex: 1; padding: 36px 40px; min-height: 100vh; }
        .cred-overlay { display: none; }
        @media (max-width: 767px) {
          .cred-sidebar { transform: translateX(-100%); width: 280px; }
          .cred-sidebar.open { transform: translateX(0); }
          .cred-topbar {
            display: flex; align-items: center; justify-content: space-between;
            position: fixed; top: 0; left: 0; right: 0; height: 56px;
            background: var(--navy); border-bottom: 1px solid rgba(255,255,255,.07);
            padding: 0 16px; z-index: 49;
          }
          .cred-main  { margin-left: 0; padding: 72px 16px 32px; }
          .cred-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 48; opacity: 0; pointer-events: none; transition: opacity .25s; }
          .cred-overlay.open { opacity: 1; pointer-events: auto; }
        }
      `}</style>

      <div className={`cred-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <div className="cred-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #FF6524 0%, #F2B825 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={13} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 14, color: '#fff' }}>GÁS<span style={{ color: 'var(--flame)' }}>PAGO</span></span>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <aside className={`cred-sidebar${open ? ' open' : ''}`}>
        <div style={{ padding: '22px 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #FF6524 0%, #F2B825 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#fff' }}>
              GÁS<span style={{ color: 'var(--flame)' }}>PAGO</span>
            </div>
          </div>
          <div style={{ marginTop: 10, padding: '4px 8px', borderRadius: 5, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#F59E0B', letterSpacing: '.08em', textTransform: 'uppercase' }}>Credenciador</span>
          </div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '0 16px' }} />
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.25)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '8px 10px 6px' }}>Painel</p>
          {nav.map(({ href, label, Icon }) => {
            const exact = href === '/credenciador'
            const active = exact ? path === href : (path?.startsWith(href) ?? false)
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                color: active ? '#fff' : 'rgba(255,255,255,.55)', background: active ? 'rgba(245,158,11,.14)' : 'transparent',
                fontSize: 13.5, fontWeight: active ? 600 : 400, transition: 'all .15s', textDecoration: 'none',
                borderLeft: active ? '2px solid #F59E0B' : '2px solid transparent',
              }}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {label}
                {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: .5 }} />}
              </Link>
            )
          })}
        </nav>
      </aside>

      <main className="cred-main">{children}</main>
    </div>
  )
}
