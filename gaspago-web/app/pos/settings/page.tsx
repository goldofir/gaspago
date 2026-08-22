'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Phone, Tag, Bell, LogOut } from 'lucide-react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_pos_token'

const CATEGORY_LABELS: Record<string, string> = {
  restaurante: 'Restaurante',
  farmacia: 'Farmácia',
  mercado: 'Mercado',
  servico: 'Serviço',
}

type Establishment = {
  name: string
  category: string
  phone?: string | null
}

function InfoRow({ Icon, label, value }: { Icon: any; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color="#10B981" />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{value || '–'}</div>
      </div>
    </div>
  )
}

export default function PosSettingsPage() {
  const router = useRouter()
  const [est, setEst] = useState<Establishment | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    portalFetch(TOKEN_KEY, `${API}/pos/me`)
      .then(r => r.json())
      .then(setEst)
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY)
    router.push('/pos/login')
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Balcão</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Configurações</h1>
      </div>

      {/* Account info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Dados do estabelecimento</h2>
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0' }}>Carregando…</p>
        ) : !est ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0' }}>Não foi possível carregar os dados da conta.</p>
        ) : (
          <div>
            <InfoRow Icon={Store} label="Nome" value={est.name} />
            <InfoRow Icon={Tag} label="Categoria" value={CATEGORY_LABELS[est.category] ?? est.category} />
            <InfoRow Icon={Phone} label="Telefone" value={est.phone ?? ''} />
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Notificações</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={15} color="#10B981" />
          </div>
          <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500, flex: 1 }}>Receber notificações de novas cobranças</span>
          <input
            type="checkbox"
            checked={notifications}
            onChange={e => setNotifications(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--flame)', cursor: 'pointer' }}
          />
        </label>
      </div>

      {/* Session */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Sessão</h2>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 20px', borderRadius: 9, border: '1px solid #EF4444', cursor: 'pointer',
            background: 'rgba(239,68,68,.08)', color: '#EF4444',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit', transition: 'background .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.16)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,.08)' }}
        >
          <LogOut size={15} strokeWidth={2} />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
