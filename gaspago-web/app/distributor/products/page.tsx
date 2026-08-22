'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meus Produtos',
  description: 'Cat�logo de produtos e pre�os da sua distribuidora no G�s Pago.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_distributor_token'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  weightKg: number
  isAvailable: boolean
  stock?: number
}

const emptyForm = { name: '', description: '', price: '', weightKg: '13', stock: '' }

export default function DistributorProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/distributors/me/products`)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleAvailability(product: Product) {
    setToggling(product.id)
    try {
      await portalFetch(TOKEN_KEY, `${API}/distributors/me/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailable: !p.isAvailable } : p))
    } finally {
      setToggling(null)
    }
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await portalFetch(TOKEN_KEY, `${API}/distributors/me/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          weightKg: parseFloat(form.weightKg),
          stock: form.stock ? parseInt(form.stock) : undefined,
          isAvailable: true,
        }),
      })
      setShowForm(false)
      setForm(emptyForm)
      load()
    } finally {
      setSaving(false)
    }
  }

  const inp = (name: keyof typeof emptyForm, label: string, type = 'text', placeholder = '') => (
    <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</label>
      <input
        type={type} placeholder={placeholder}
        value={form[name]}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', background: 'var(--ground)' }}
      />
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Distribuidora</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Catálogo de Produtos</h1>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
        >
          {showForm ? '✕ Fechar' : '+ Novo produto'}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={submitForm} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Novo produto</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
            {inp('name', 'Nome', 'text', 'Ex: Botijão 13kg')}
            {inp('price', 'Preço (R$)', 'number', '109.90')}
            {inp('weightKg', 'Peso (kg)', 'number', '13')}
            {inp('stock', 'Estoque (opcional)', 'number', '')}
            {inp('description', 'Descrição (opcional)')}
          </div>
          <button
            type="submit" disabled={saving}
            style={{ padding: '10px 22px', borderRadius: 9, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
          >
            {saving ? 'Salvando…' : 'Adicionar produto'}
          </button>
        </form>
      )}

      {/* Product grid */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando catálogo…</div>
      ) : products.length === 0 ? (
        <div style={{ padding: '64px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>📦</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Nenhum produto cadastrado</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Clique em "+ Novo produto" para adicionar seus botijões.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 20px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{p.weightKg}kg</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: p.isAvailable ? '#10B98118' : '#EF444418', color: p.isAvailable ? '#10B981' : '#EF4444' }}>
                  {p.isAvailable ? 'Disponível' : 'Indisponível'}
                </span>
              </div>

              {p.description && (
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{p.description}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                  R$ {Number(p.price).toFixed(2).replace('.', ',')}
                </span>
                {p.stock !== undefined && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Estoque: {p.stock}</span>
                )}
              </div>

              <button
                onClick={() => toggleAvailability(p)}
                disabled={toggling === p.id}
                style={{
                  padding: '8px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${p.isAvailable ? '#EF444430' : '#10B98130'}`,
                  background: p.isAvailable ? '#EF444410' : '#10B98110',
                  color: p.isAvailable ? '#EF4444' : '#10B981',
                }}
              >
                {toggling === p.id ? '…' : p.isAvailable ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
