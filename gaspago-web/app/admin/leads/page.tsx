'use client'

import { useEffect, useState } from 'react'
import { Users, Clock, CheckCircle2, XCircle, Loader2, Truck, Store } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface Lead {
  id: string
  type: 'DISTRIBUTOR' | 'ESTABLISHMENT'
  name: string
  cnpj: string | null
  phone: string
  email: string | null
  city: string | null
  state: string | null
  category: string | null
  message: string | null
  status: 'PENDING' | 'CONTACTED' | 'APPROVED' | 'REJECTED'
  notes: string | null
  createdAt: string
}

const STATUS_META: Record<Lead['status'], { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Pendente', bg: 'rgba(245,158,11,.12)', color: 'var(--amber)' },
  CONTACTED: { label: 'Em contato', bg: 'rgba(59,130,246,.12)', color: '#3B82F6' },
  APPROVED: { label: 'Aprovado', bg: 'var(--green-dim)', color: 'var(--green)' },
  REJECTED: { label: 'Recusado', bg: 'rgba(239,68,68,.12)', color: 'var(--red)' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await adminFetch(`${API}/admin/leads?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar leads')
      const data = await res.json()
      setLeads(data.leads)
      setPendingCount(data.pendingCount)
    } catch (e: any) {
      setError(e.message ?? 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, typeFilter])

  async function updateStatus(id: string, status: Lead['status']) {
    setBusyId(id)
    try {
      const res = await adminFetch(`${API}/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
        setPendingCount(prev => status !== 'PENDING' ? Math.max(0, prev - 1) : prev)
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Crescimento
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Cadastros de Parceiros
          </h1>
          <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--sub)' }}>
            Formulário "Quero ser parceira" / "Quero anunciar" do site — {pendingCount} pendente{pendingCount !== 1 ? 's' : ''} de análise.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: '', label: 'Todos status' },
            { key: 'PENDING', label: 'Pendente' },
            { key: 'CONTACTED', label: 'Em contato' },
            { key: 'APPROVED', label: 'Aprovado' },
            { key: 'REJECTED', label: 'Recusado' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: statusFilter === s.key ? '1px solid var(--flame)' : '1px solid var(--border)',
                background: statusFilter === s.key ? 'rgba(255,101,36,.1)' : 'var(--surface)',
                color: statusFilter === s.key ? 'var(--flame)' : 'var(--sub)',
              }}
            >
              {s.label}
            </button>
          ))}
          <span style={{ width: 1, background: 'var(--border)' }} />
          {[
            { key: '', label: 'Todos tipos' },
            { key: 'DISTRIBUTOR', label: 'Distribuidora' },
            { key: 'ESTABLISHMENT', label: 'Estabelecimento' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                border: typeFilter === t.key ? '1px solid var(--flame)' : '1px solid var(--border)',
                background: typeFilter === t.key ? 'rgba(255,101,36,.1)' : 'var(--surface)',
                color: typeFilter === t.key ? 'var(--flame)' : 'var(--sub)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--sub)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
          </div>
        ) : error ? (
          <div style={{ color: 'var(--red)', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>{error}</div>
        ) : leads.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15 }}>Nenhum cadastro encontrado</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leads.map(lead => (
              <div key={lead.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--ground)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {lead.type === 'DISTRIBUTOR' ? <Truck size={16} color="var(--sub)" /> : <Store size={16} color="var(--sub)" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{lead.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                        {lead.type === 'DISTRIBUTOR' ? 'Distribuidora' : 'Estabelecimento'}
                        {lead.category && ` · ${lead.category}`}
                        {lead.city && ` · ${lead.city}${lead.state ? '/' + lead.state : ''}`}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--sub)', marginTop: 6 }}>
                        📞 {lead.phone}{lead.email && ` · ${lead.email}`}{lead.cnpj && ` · CNPJ ${lead.cnpj}`}
                      </div>
                      {lead.message && (
                        <div style={{ fontSize: 12.5, color: 'var(--sub)', marginTop: 6, fontStyle: 'italic' }}>"{lead.message}"</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                      background: STATUS_META[lead.status].bg, color: STATUS_META[lead.status].color,
                    }}>
                      {STATUS_META[lead.status].label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(lead.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  {(['CONTACTED', 'APPROVED', 'REJECTED'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(lead.id, s)}
                      disabled={busyId === lead.id || lead.status === s}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: lead.status === s ? 'default' : 'pointer',
                        border: '1px solid var(--border)', background: lead.status === s ? 'var(--ground)' : 'var(--surface)',
                        color: lead.status === s ? 'var(--muted)' : 'var(--text)', opacity: busyId === lead.id ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {s === 'CONTACTED' && <Clock size={12} />}
                      {s === 'APPROVED' && <CheckCircle2 size={12} />}
                      {s === 'REJECTED' && <XCircle size={12} />}
                      {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
