'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { adminFetch } from '../../_components/adminFetch'
import {
  Search,
  Store,
  Star,
  MapPin,
  Package,
  ShoppingBag,
  Layers,
  Trophy,
  Loader2,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface Establishment {
  id: string
  name: string
  cnpj: string
  category: string
  city: string
  state: string
  rating: number
  ratingCount: number
  cashbackPercent: number
  isActive: boolean
  createdAt: string
  _count?: {
    marketplaceItems: number
    posPayments: number
  }
}

interface CategoryCount {
  category: string
  count: number
}

interface Stats {
  total: number
  active: number
  inactive?: number
  byCategory?: CategoryCount[] | Record<string, number>
}

const CATEGORY_LABELS: Record<string, string> = {
  restaurante: 'Restaurante',
  farmacia: 'Farmácia',
  mercado: 'Mercado',
  beleza: 'Beleza',
  servico: 'Serviços',
  pet: 'Pet',
  educacao: 'Educação',
  automotivo: 'Automotivo',
}

const CATEGORY_ORDER = [
  'restaurante',
  'farmacia',
  'mercado',
  'beleza',
  'servico',
  'pet',
  'educacao',
  'automotivo',
]

const CATEGORY_BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  restaurante: { bg: 'rgba(255,101,36,.10)', fg: 'var(--flame)' },
  farmacia: { bg: 'rgba(34,197,94,.10)', fg: 'var(--green)' },
  mercado: { bg: 'rgba(37,99,235,.10)', fg: '#2563EB' },
  beleza: { bg: 'rgba(236,72,153,.10)', fg: '#DB2777' },
  servico: { bg: 'rgba(148,163,184,.15)', fg: 'var(--sub)' },
  pet: { bg: 'rgba(242,184,37,.14)', fg: '#B7791F' },
  educacao: { bg: 'rgba(99,102,241,.10)', fg: '#4F46E5' },
  automotivo: { bg: 'rgba(148,163,184,.15)', fg: '#334155' },
}

function categoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1)
}

function categoryColors(cat: string) {
  return CATEGORY_BADGE_COLORS[cat] ?? { bg: 'rgba(148,163,184,.15)', fg: 'var(--sub)' }
}

function normalizeByCategory(input?: Stats['byCategory']): CategoryCount[] {
  if (!input) return []
  if (Array.isArray(input)) return input
  return Object.entries(input).map(([category, count]) => ({ category, count }))
}

function formatCNPJ(value: string) {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          fill={i <= Math.round(rating) ? 'var(--gold)' : 'none'}
          stroke={i <= Math.round(rating) ? 'var(--gold)' : 'var(--muted)'}
        />
      ))}
      <span style={{ fontSize: 12, color: 'var(--sub)', marginLeft: 4 }}>
        {rating ? rating.toFixed(1) : '—'}
      </span>
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: active ? 'var(--green-dim)' : 'var(--red-dim)',
        color: active ? 'var(--green)' : 'var(--red)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: active ? 'var(--green)' : 'var(--red)',
          display: 'inline-block',
        }}
      />
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const c = categoryColors(category)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {categoryLabel(category)}
    </span>
  )
}

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon: React.ElementType
  color: string
  loading: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: 'var(--shadow)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            margin: 0,
          }}
        >
          {label}
        </p>
        {loading ? (
          <div
            style={{
              width: 56,
              height: 22,
              borderRadius: 6,
              background: 'var(--border)',
              marginTop: 6,
            }}
          />
        ) : (
          <>
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'var(--text)',
                margin: '3px 0 0',
                fontFamily: 'Sora, sans-serif',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {value}
            </p>
            {sublabel && (
              <p style={{ fontSize: 12, color: 'var(--sub)', margin: '2px 0 0' }}>{sublabel}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EstablishmentCard({ establishment: e }: { establishment: Establishment }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {e.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            {formatCNPJ(e.cnpj)}
          </p>
        </div>
        <StatusBadge active={e.isActive} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <CategoryBadge category={e.category} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sub)', fontSize: 13 }}>
          <MapPin size={13} />
          {e.city}/{e.state}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--flame)',
              background: 'var(--flame-dim)',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            {Math.round((e.cashbackPercent ?? 0) * 100)}% cashback
          </span>
          <StarRating rating={e.rating} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 12.5,
          color: 'var(--sub)',
          borderTop: '1px solid var(--border)',
          paddingTop: 10,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Package size={13} />
          {e._count?.marketplaceItems ?? 0} itens
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ShoppingBag size={13} />
          {e._count?.posPayments ?? 0} pedidos
        </span>
      </div>
    </div>
  )
}

export default function EstablishmentsPage() {
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      setLoadingStats(true)
      try {
        const res = await adminFetch(`${API}/admin/establishments/stats`)
        if (!res.ok) throw new Error('Falha ao carregar estatísticas')
        const data = await res.json()
        setStats(data)
      } catch {
        setStats(null)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [])

  const fetchEstablishments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.set('search', search)
      if (category !== 'ALL') params.set('category', category)
      const res = await adminFetch(`${API}/admin/establishments?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar')
      const data = await res.json()
      setEstablishments(Array.isArray(data) ? data : data?.items ?? [])
    } catch {
      setEstablishments([])
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    const timer = setTimeout(fetchEstablishments, 300)
    return () => clearTimeout(timer)
  }, [fetchEstablishments])

  const categoryCounts = useMemo(() => normalizeByCategory(stats?.byCategory), [stats])

  const topCategory = useMemo(() => {
    if (categoryCounts.length === 0) return null
    return categoryCounts.reduce((max, c) => (c.count > max.count ? c : max), categoryCounts[0])
  }, [categoryCounts])

  const categoriesRepresented = useMemo(
    () => categoryCounts.filter((c) => c.count > 0).length,
    [categoryCounts]
  )

  const chipOptions = useMemo(() => {
    const known = CATEGORY_ORDER
    const extra = categoryCounts
      .map((c) => c.category)
      .filter((c) => !known.includes(c))
    return [...known, ...extra]
  }, [categoryCounts])

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .estab-stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .estab-chip {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--sub);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all .15s;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }
        .estab-chip:hover { border-color: var(--flame); color: var(--flame); }
        .estab-chip.active { background: var(--flame); border-color: var(--flame); color: #fff; font-weight: 600; }
        .estab-search-input:focus { border-color: var(--flame) !important; box-shadow: 0 0 0 3px var(--flame-dim); }
        @media (max-width: 767px) {
          .estab-stats-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 32px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Marketplace
          </p>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: isMobile ? 26 : 32,
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              color: 'var(--text)',
            }}
          >
            Estabelecimentos
          </h1>
        </div>

        {/* Stats */}
        <div className="estab-stats-row">
          <StatCard
            label="Total"
            value={stats?.total ?? 0}
            icon={Store}
            color="var(--flame)"
            loading={loadingStats}
          />
          <StatCard
            label="Ativos"
            value={stats?.active ?? 0}
            icon={ShoppingBag}
            color="var(--green)"
            loading={loadingStats}
          />
          <StatCard
            label="Categorias"
            value={categoriesRepresented || (loadingStats ? 0 : categoryCounts.length)}
            sublabel="representadas"
            icon={Layers}
            color="#2563EB"
            loading={loadingStats}
          />
          <StatCard
            label="Categoria Líder"
            value={topCategory ? categoryLabel(topCategory.category) : '—'}
            sublabel={topCategory ? `${topCategory.count} estabelecimentos` : undefined}
            icon={Trophy}
            color="var(--gold)"
            loading={loadingStats}
          />
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              className="estab-search-input"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                border: '1.5px solid var(--border)',
                borderRadius: 9,
                fontSize: 14,
                color: 'var(--text)',
                background: 'var(--surface)',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            className={`estab-chip${category === 'ALL' ? ' active' : ''}`}
            onClick={() => setCategory('ALL')}
          >
            Todos
          </button>
          {chipOptions.map((cat) => (
            <button
              key={cat}
              className={`estab-chip${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 240,
              color: 'var(--muted)',
              gap: 10,
            }}
          >
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Carregando estabelecimentos...</span>
          </div>
        ) : establishments.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 280,
              gap: 12,
              color: 'var(--muted)',
            }}
          >
            <Store size={48} strokeWidth={1.2} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--sub)' }}>
              Nenhum estabelecimento encontrado
            </p>
            <p style={{ margin: 0, fontSize: 13 }}>
              {search || category !== 'ALL'
                ? 'Tente ajustar a busca ou o filtro de categoria'
                : 'Nenhum estabelecimento cadastrado ainda'}
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile card list */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {establishments.map((e) => (
              <EstablishmentCard key={e.id} establishment={e} />
            ))}
          </div>
        ) : (
          /* Desktop table */
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                    {[
                      'Nome / CNPJ',
                      'Categoria',
                      'Cidade / UF',
                      'Cashback %',
                      'Avaliação',
                      'Itens no Catálogo',
                      'Pedidos',
                      'Status',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {establishments.map((e, i) => (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: i < establishments.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={(ev) =>
                        ((ev.currentTarget as HTMLElement).style.background = 'var(--surface-2)')
                      }
                      onMouseLeave={(ev) =>
                        ((ev.currentTarget as HTMLElement).style.background = 'transparent')
                      }
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          {e.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                          {formatCNPJ(e.cnpj)}
                        </p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <CategoryBadge category={e.category} />
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--sub)' }}>
                        {e.city}/{e.state}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--flame)',
                            background: 'var(--flame-dim)',
                            padding: '3px 8px',
                            borderRadius: 6,
                          }}
                        >
                          {Math.round((e.cashbackPercent ?? 0) * 100)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StarRating rating={e.rating} />
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--sub)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Package size={13} />
                          {e._count?.marketplaceItems ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--sub)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <ShoppingBag size={13} />
                          {e._count?.posPayments ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge active={e.isActive} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
