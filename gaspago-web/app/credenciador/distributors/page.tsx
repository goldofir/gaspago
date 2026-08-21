'use client'
import { useState, useEffect } from 'react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_credenciador_token'

type Distributor = {
  id: string; name: string; cnpj: string; city: string; state: string
  rating: number; cashbackPercent: number; isActive: boolean; createdAt: string
  _count?: { orders: number }
}

const emptyForm = { name: '', cnpj: '', phone: '', address: '', city: '', state: '', postalCode: '', serviceRadiusKm: 5, cashbackPercent: 20 }

export default function CredenciadorDistributorsPage() {
  const [distributors, setDistributors] = useState<Distributor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/credenciador/me/distributors`)
      const data = await res.json()
      setDistributors(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await portalFetch(TOKEN_KEY, `${API}/distributors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cashbackPercent: form.cashbackPercent / 100 }),
      })
      setShowForm(false)
      setForm(emptyForm)
      load()
    } finally {
      setSaving(false)
    }
  }

  const inp = (name: keyof typeof emptyForm, label: string, type = 'text') => (
    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      <input
        type={type} required={name !== 'postalCode'}
        value={String(form[name])}
        onChange={e => setForm(f => ({ ...f, [name]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--ground)' }}
      />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Credenciador</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Distribuidoras</h1>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          {showForm ? '✕ Fechar' : '+ Cadastrar'}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={submitForm} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Nova Distribuidora</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            {inp('name', 'Nome')}
            {inp('cnpj', 'CNPJ')}
            {inp('phone', 'Telefone')}
            {inp('address', 'Endereço')}
            {inp('city', 'Cidade')}
            {inp('state', 'Estado')}
            {inp('postalCode', 'CEP')}
            {inp('serviceRadiusKm', 'Raio (km)', 'number')}
            {inp('cashbackPercent', 'Cashback inicial (%)', 'number')}
          </div>
          <button type="submit" disabled={saving} style={{ padding: '10px 22px', borderRadius: 9, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            {saving ? 'Cadastrando…' : 'Cadastrar Distribuidora'}
          </button>
        </form>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>
        ) : distributors.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhuma distribuidora cadastrada ainda. Clique em "+ Cadastrar" para começar.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                  {['Nome', 'Cidade', 'Cashback', 'Avaliação', 'Pedidos/mês', 'Desde', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {distributors.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>{d.name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{d.city}, {d.state}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--flame)' }}>{Math.round(d.cashbackPercent * 100)}%</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text)' }}>⭐ {d.rating.toFixed(1)}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{d._count?.orders ?? 0}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{new Date(d.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: d.isActive ? '#10B98118' : '#EF444418', color: d.isActive ? '#10B981' : '#EF4444' }}>
                        {d.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
