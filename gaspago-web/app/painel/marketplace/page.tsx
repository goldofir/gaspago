'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store, MapPin, Star, Percent, Search } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type Category = { key: string; label: string; count: number }
type Establishment = { id: string; name: string; category: string; city: string; state: string; rating: number; cashbackPercent: number }

export default function MarketplaceListPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [cep, setCep] = useState('')
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/marketplace/categories`).then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeCategory) params.set('category', activeCategory)
    if (cep.replace(/\D/g, '').length >= 5) params.set('cep', cep.replace(/\D/g, ''))
    fetch(`${API}/marketplace/establishments?${params}`)
      .then(r => r.json())
      .then(d => setEstablishments(Array.isArray(d) ? d : []))
      .catch(() => setEstablishments([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [activeCategory])

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <style>{`
        .mkt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .mkt-card:hover { box-shadow: var(--shadow) !important; border-color: var(--flame) !important; }
        .mkt-chip { padding: 6px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--sub); white-space: nowrap; }
        .mkt-chip.active { background: var(--flame); color: #fff; border-color: var(--flame); }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Cashback</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>Marketplace</h1>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>Compre em estabelecimentos parceiros e ganhe cashback em FGOL.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 20, padding: '5px 12px', background: 'var(--surface)' }}>
          <Search size={13} color="var(--muted)" />
          <input
            value={cep}
            onChange={e => setCep(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="CEP"
            style={{ border: 'none', outline: 'none', fontSize: 12.5, width: 90, background: 'transparent' }}
          />
        </div>
        <button className="mkt-chip" onClick={() => setActiveCategory(null)} style={{ background: !activeCategory ? 'var(--flame)' : 'var(--surface)', color: !activeCategory ? '#fff' : 'var(--sub)', borderColor: !activeCategory ? 'var(--flame)' : 'var(--border)' }}>
          Todos
        </button>
        {categories.map(c => (
          <button key={c.key} className="mkt-chip" onClick={() => setActiveCategory(c.key)} style={{ background: activeCategory === c.key ? 'var(--flame)' : 'var(--surface)', color: activeCategory === c.key ? '#fff' : 'var(--sub)', borderColor: activeCategory === c.key ? 'var(--flame)' : 'var(--border)' }}>
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Carregando…</div>
      ) : establishments.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
          <Store size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 14 }}>Nenhum estabelecimento encontrado.</div>
        </div>
      ) : (
        <div className="mkt-grid">
          {establishments.map(e => (
            <Link key={e.id} href={`/painel/marketplace/${e.id}`} style={{ textDecoration: 'none' }}>
              <div className="mkt-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)', transition: 'box-shadow .15s, border-color .15s' }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{e.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  <MapPin size={11} /> {e.city}/{e.state}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12.5, color: 'var(--amber)', fontWeight: 600 }}>
                    <Star size={12} fill="var(--amber)" /> {e.rating.toFixed(1)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 8px', borderRadius: 20 }}>
                    <Percent size={10} /> {Math.round(e.cashbackPercent * 100)}% cashback
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
