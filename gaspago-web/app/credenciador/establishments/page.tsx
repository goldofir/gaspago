'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Estabelecimentos',
  description: 'Estabelecimentos parceiros vinculados ao seu credenciamento no G�s Pago.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_credenciador_token'

type Establishment = {
  id: string
  name: string
  cnpj?: string
  city: string
  state: string
  cashbackPercent: number
  isActive: boolean
  createdAt: string
}

const emptyForm = { name: '', cnpj: '', companyType: 'LIMITED', phone: '', address: '', city: '', state: '', postalCode: '', cashbackPercent: 10 }
const COMPANY_TYPES = [
  { value: 'MEI', label: 'MEI' },
  { value: 'LIMITED', label: 'Ltda / Sociedade Limitada' },
  { value: 'INDIVIDUAL', label: 'Empresário Individual' },
  { value: 'ASSOCIATION', label: 'Associação / Cooperativa' },
]

export default function CredenciadorEstablishmentsPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/credenciador/me/establishments`)
      const data = await res.json()
      setEstablishments(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/establishments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cashbackPercent: form.cashbackPercent / 100 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível cadastrar o estabelecimento.')
        return
      }
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
        type={type}
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
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Estabelecimentos</h1>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
        >
          {showForm ? '✕ Fechar' : '+ Cadastrar'}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={submitForm} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Novo Estabelecimento</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            {inp('name', 'Nome do estabelecimento')}
            {inp('cnpj', 'CNPJ')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Tipo de empresa</label>
              <select
                required value={form.companyType}
                onChange={e => setForm(f => ({ ...f, companyType: e.target.value }))}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--ground)' }}
              >
                {COMPANY_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {inp('phone', 'Telefone')}
            {inp('address', 'Endereço')}
            {inp('city', 'Cidade')}
            {inp('state', 'Estado')}
            {inp('postalCode', 'CEP')}
            {inp('cashbackPercent', 'Cashback (%)', 'number')}
          </div>
          {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <button
            type="submit" disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 9, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
          >
            {saving ? 'Cadastrando…' : 'Cadastrar Estabelecimento'}
          </button>
        </form>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>
        ) : establishments.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Nenhum estabelecimento cadastrado. Clique em "+ Cadastrar" para começar.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                  {['Nome', 'Cidade', 'Cashback', 'Desde', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {establishments.map(est => (
                  <tr key={est.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>{est.name}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{est.city}, {est.state}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--flame)' }}>{Math.round(est.cashbackPercent * 100)}%</td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>{new Date(est.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: est.isActive ? '#10B98118' : '#EF444418', color: est.isActive ? '#10B981' : '#EF4444' }}>
                        {est.isActive ? 'Ativo' : 'Inativo'}
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
