'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  billingCycle: 'MONTHLY' | 'YEARLY'
  features: string[]
  isActive: boolean
  _count?: { subscriptions: number }
}

interface FormState {
  id: string | null
  name: string
  slug: string
  price: string
  billingCycle: 'MONTHLY' | 'YEARLY'
  features: string
  isActive: boolean
}

const EMPTY_FORM: FormState = { id: null, name: '', slug: '', price: '', billingCycle: 'MONTHLY', features: '', isActive: true }

function formatPrice(price: number | string, cycle: string) {
  return `R$ ${Number(price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/${cycle === 'YEARLY' ? 'ano' : 'mês'}`
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`${API}/admin/plans`)
      if (!res.ok) throw new Error('Erro ao carregar planos')
      setPlans(await res.json())
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(plan: Plan) {
    setForm({
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      price: String(plan.price),
      billingCycle: plan.billingCycle,
      features: plan.features.join(', '),
      isActive: plan.isActive,
    })
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSave() {
    setFormError(null)
    const price = Number(form.price.replace(',', '.'))
    if (!form.name.trim()) return setFormError('Nome é obrigatório.')
    if (!form.slug.trim()) return setFormError('Slug é obrigatório.')
    if (!Number.isFinite(price) || price < 0) return setFormError('Preço inválido.')

    const body = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      price,
      billingCycle: form.billingCycle,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
      isActive: form.isActive,
    }

    setSaving(true)
    try {
      const headers = { 'Content-Type': 'application/json' }
      const res = form.id
        ? await adminFetch(`${API}/admin/plans/${form.id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
        : await adminFetch(`${API}/admin/plans`, { method: 'POST', headers, body: JSON.stringify(body) })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? 'Erro ao salvar plano')
      }
      setFormOpen(false)
      await load()
    } catch (e: any) {
      setFormError(e.message ?? 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(plan: Plan) {
    if (!confirm(`Desativar o plano "${plan.name}"? Assinantes atuais continuam ativos, mas ninguém mais poderá assinar este plano.`)) return
    try {
      const res = await adminFetch(`${API}/admin/plans/${plan.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao desativar plano')
      await load()
    } catch (e: any) {
      alert(e.message ?? 'Erro desconhecido')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Monetização
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              Planos
            </h1>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8,
              background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Novo Plano
          </button>
        </div>

        {formOpen && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{form.id ? 'Editar plano' : 'Novo plano'}</h2>
              <button onClick={() => setFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ color: 'var(--red)', marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: 13.5 }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
              <label style={fieldStyle}>
                Nome
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Premium" />
              </label>
              <label style={fieldStyle}>
                Slug
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} style={inputStyle} placeholder="premium" />
              </label>
              <label style={fieldStyle}>
                Preço (R$)
                <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={inputStyle} placeholder="29,90" />
              </label>
              <label style={fieldStyle}>
                Cobrança
                <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value as 'MONTHLY' | 'YEARLY' }))} style={inputStyle}>
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </label>
            </div>

            <label style={{ ...fieldStyle, marginBottom: 14 }}>
              Benefícios (separados por vírgula)
              <input value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} style={inputStyle} placeholder="Cashback maior, Suporte prioritário" />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13.5, color: 'var(--sub)' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              Plano ativo (visível para assinatura)
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '10px 20px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button onClick={() => setFormOpen(false)} style={{ padding: '10px 20px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sub)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando planos...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--red)', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>
        ) : plans.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <Package size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15 }}>Nenhum plano cadastrado</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow)', opacity: plan.isActive ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{plan.slug}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(plan)} style={iconBtnStyle} title="Editar"><Pencil size={14} /></button>
                    {plan.isActive && <button onClick={() => handleDeactivate(plan)} style={iconBtnStyle} title="Desativar"><Trash2 size={14} /></button>}
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--flame)', margin: '10px 0' }}>
                  {formatPrice(plan.price, plan.billingCycle)}
                </div>
                {plan.features.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--sub)', lineHeight: 1.7 }}>
                    {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>{plan.isActive ? 'Ativo' : 'Inativo'}</span>
                  <span>{plan._count?.subscriptions ?? 0} assinante(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 767px) { h1 { font-size: 22px !important; } }
      `}</style>
    </div>
  )
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sub)' }
const inputStyle: React.CSSProperties = { padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--ground)' }
const iconBtnStyle: React.CSSProperties = { padding: 6, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--sub)', cursor: 'pointer', display: 'flex' }
