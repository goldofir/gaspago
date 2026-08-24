'use client'
import { useState, useEffect } from 'react'
import { Package, Trash2, Eye, EyeOff, ImageOff } from 'lucide-react'
import { portalFetch } from '../../_components/portalFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_pos_token'

type CatalogItem = {
  id: string
  name: string
  description?: string | null
  price: string | number
  imageUrl?: string | null
  isAvailable: boolean
  createdAt: string
}

const emptyForm = { name: '', description: '', price: '', imageUrl: '', isAvailable: true }

function formatPrice(price: string | number) {
  return `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PosCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/pos/me/catalog`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
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
      const priceValue = parseFloat(form.price.replace(',', '.'))
      if (!form.name.trim()) {
        setError('Informe o nome do item.')
        return
      }
      if (!priceValue || priceValue <= 0) {
        setError('Informe um preço válido.')
        return
      }
      const res = await portalFetch(TOKEN_KEY, `${API}/pos/me/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          price: priceValue,
          imageUrl: form.imageUrl.trim() || undefined,
          isAvailable: form.isAvailable,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível cadastrar o item.')
        return
      }
      setShowForm(false)
      setForm(emptyForm)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailable(item: CatalogItem) {
    setBusyId(item.id)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/pos/me/catalog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function deleteItem(item: CatalogItem) {
    // DELETE is a soft-delete on the API (isAvailable: false) — GET /pos/me/catalog still
    // returns the row, so reflect that here instead of removing it (it would reappear on reload).
    if (!window.confirm(`Ocultar "${item.name}" do catálogo? Ele deixará de aparecer no marketplace.`)) return
    setBusyId(item.id)
    try {
      const res = await portalFetch(TOKEN_KEY, `${API}/pos/me/catalog/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: false } : i))
      }
    } finally {
      setBusyId(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)',
    fontSize: 13, color: 'var(--text)', background: 'var(--ground)', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em',
  }

  return (
    <div>
      <style>{`
        .catalog-table-wrap { display: block; }
        .catalog-cards { display: none; }
        @media (max-width: 767px) {
          .catalog-table-wrap { display: none; }
          .catalog-cards { display: flex; flex-direction: column; gap: 12px; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>Catálogo</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Meus Produtos e Serviços</h1>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          {showForm ? '✕ Fechar' : '+ Novo Item'}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={submitForm} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>Novo Item</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Nome</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Preço (R$)</label>
              <input required inputMode="decimal" placeholder="0,00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={labelStyle}>Imagem (URL opcional)</label>
              <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} style={inputStyle} placeholder="https://…" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Descrição</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', paddingTop: 20 }}>
              <input type="checkbox" checked={form.isAvailable} onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))} />
              Disponível no marketplace
            </label>
          </div>
          {error && <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={saving} style={{ padding: '10px 22px', borderRadius: 9, background: 'var(--flame)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando…' : 'Salvar Item'}
          </button>
        </form>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando catálogo…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Nenhum item cadastrado ainda. Adicione produtos ou serviços para aparecer no marketplace.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="catalog-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--ground)' }}>
                    {['Item', 'Descrição', 'Preço', 'Status', 'Ações'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--ground)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={15} color="var(--muted)" />
                            </div>
                          )}
                          {item.name}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>{formatPrice(item.price)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: item.isAvailable ? '#10B98118' : '#EF444418', color: item.isAvailable ? '#10B981' : '#EF4444' }}>
                          {item.isAvailable ? 'Disponível' : 'Indisponível'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => toggleAvailable(item)}
                            disabled={busyId === item.id}
                            title={item.isAvailable ? 'Marcar como indisponível' : 'Marcar como disponível'}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--ground)', color: 'var(--sub)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: busyId === item.id ? 0.5 : 1 }}
                          >
                            {item.isAvailable ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => deleteItem(item)}
                            disabled={busyId === item.id}
                            title="Remover item"
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.06)', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: busyId === item.id ? 0.5 : 1 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="catalog-cards" style={{ padding: 12 }}>
              {items.map(item => (
                <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--ground)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageOff size={16} color="var(--muted)" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{item.name}</div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--flame)' }}>{formatPrice(item.price)}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: item.isAvailable ? '#10B98118' : '#EF444418', color: item.isAvailable ? '#10B981' : '#EF4444', whiteSpace: 'nowrap' }}>
                      {item.isAvailable ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                  {item.description && (
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{item.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => toggleAvailable(item)}
                      disabled={busyId === item.id}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--ground)', color: 'var(--sub)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: busyId === item.id ? 0.5 : 1 }}
                    >
                      {item.isAvailable ? <EyeOff size={13} /> : <Eye size={13} />}
                      {item.isAvailable ? 'Ocultar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deleteItem(item)}
                      disabled={busyId === item.id}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.06)', color: 'var(--red)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: busyId === item.id ? 0.5 : 1 }}
                    >
                      <Trash2 size={13} />
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
