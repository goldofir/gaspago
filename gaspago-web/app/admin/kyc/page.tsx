'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Eye, RotateCw, RefreshCw, UserCheck, ShieldAlert, FileText } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface KycItem {
  id: string
  userId: string
  targetLevel: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPECTED_FRAUD'
  documentType: string
  documentNumber: string
  fullName: string
  cpf: string
  submittedAt: string
  ocrConfidence: number
  livenessScore: number
  user?: {
    name?: string
    phone?: string
    email?: string
    cpf?: string
  }
}

interface DetailedKyc extends KycItem {
  frontUrl: string
  backUrl?: string | null
  selfieUrl: string
  adminNotes?: string
  rejectionReason?: string
  auditLogs?: any[]
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING_REVIEW:   { label: 'Pendente de Análise', bg: 'rgba(245,158,11,.14)', color: '#F59E0B' },
  APPROVED:         { label: 'Aprovado ⭐',          bg: 'rgba(16,185,129,.14)', color: '#10B981' },
  REJECTED:         { label: 'Rejeitado',            bg: 'rgba(239,68,68,.14)',  color: '#EF4444' },
  SUSPECTED_FRAUD:  { label: 'Suspeita de Fraude 🚨',bg: 'rgba(220,38,38,.2)',  color: '#DC2626' },
}

export default function AdminKycPage() {
  const [items, setItems] = useState<KycItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_REVIEW')

  // Inspection Modal state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailedKyc | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [notesInput, setNotesInput] = useState('')
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const loadSubmissions = useCallback(() => {
    setLoading(true)
    const url = filterStatus ? `${API}/admin/kyc?status=${filterStatus}` : `${API}/admin/kyc`
    adminFetch(url)
      .then(r => r.json())
      .then(data => {
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus])

  useEffect(() => {
    loadSubmissions()
  }, [loadSubmissions])

  function openInspection(id: string) {
    setSelectedId(id)
    setLoadingDetail(true)
    setDetail(null)
    setNotesInput('')
    setMsg(null)

    adminFetch(`${API}/admin/kyc/${id}`)
      .then(r => r.json())
      .then(data => {
        setDetail(data)
      })
      .catch(() => {
        setMsg({ text: 'Não foi possível carregar os detalhes do KYC.', type: 'error' })
      })
      .finally(() => setLoadingDetail(false))
  }

  function handleReview(action: 'APPROVE' | 'REJECT' | 'FRAUD') {
    if (!selectedId) return
    setActionLoading(true)
    setMsg(null)

    adminFetch(`${API}/admin/kyc/${selectedId}/review`, {
      method: 'POST',
      body: JSON.stringify({ action, notes: notesInput }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setMsg({ text: `KYC atualizado com sucesso (${action})!`, type: 'success' })
          loadSubmissions()
          setTimeout(() => setSelectedId(null), 1200)
        } else {
          setMsg({ text: data.error || 'Erro ao revisar KYC.', type: 'error' })
        }
      })
      .catch(() => {
        setMsg({ text: 'Erro de comunicação com o servidor.', type: 'error' })
      })
      .finally(() => setActionLoading(false))
  }

  const pendingCount = items.filter(i => i.status === 'PENDING_REVIEW').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Segurança & Compliance</p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>Compliance KYC Premium</h1>
        </div>
        <button
          onClick={loadSubmissions}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9,
            background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--text)'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F59E0B', marginBottom: 8 }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Pendentes</span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{total}</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#10B981', marginBottom: 8 }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Nível Exigido</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>Nível 2 (Biometria + RG)</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3B82F6', marginBottom: 8 }}>
            <ShieldCheck size={18} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Segurança</span>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>MinIO Privado + WebP 1920px</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPECTED_FRAUD', ''].map(st => {
          const cfg = STATUS_LABELS[st] ?? { label: 'Todos os Registros' }
          const active = filterStatus === st
          return (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '8px 16px', borderRadius: 20, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                background: active ? 'var(--navy)' : 'var(--surface)',
                color: active ? '#FFF' : 'var(--muted)',
                border: active ? '1px solid var(--navy)' : '1px solid var(--border)',
                transition: 'all .15s'
              }}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Main Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        {loading ? (
          <p style={{ padding: 32, textStyle: 'center', color: 'var(--muted)', fontSize: 14 }}>Carregando solicitações de KYC…</p>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <UserCheck size={40} color="var(--muted)" style={{ marginBottom: 12, opacity: .5 }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Nenhuma solicitação encontrada</p>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Não há verificações de identidade com este filtro no momento.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ground)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                <th style={{ padding: '14px 18px' }}>Usuário</th>
                <th style={{ padding: '14px 18px' }}>Documento</th>
                <th style={{ padding: '14px 18px' }}>IA / Score</th>
                <th style={{ padding: '14px 18px' }}>Status</th>
                <th style={{ padding: '14px 18px' }}>Data</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const st = STATUS_LABELS[item.status] ?? { label: item.status, bg: 'var(--ground)', color: 'var(--text)' }
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{item.fullName || item.user?.name || 'Sem nome'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>CPF: {item.cpf} · {item.user?.phone ?? ''}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.documentType}</span>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Nº {item.documentNumber}</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#10B981' }}>OCR: {Math.round(item.ocrConfidence * 100)}%</div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3B82F6' }}>Liveness: {Math.round(item.livenessScore * 100)}%</div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(item.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => openInspection(item.id)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, border: '1px solid var(--flame)',
                          background: 'rgba(255,101,36,.08)', color: 'var(--flame)',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                        }}
                      >
                        <Eye size={13} />
                        Inspecionar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspection & Document Review Modal */}
      {selectedId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
            width: '100%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Inspeção de Segurança</span>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Análise Biométrica e Documental</h2>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                style={{ background: 'transparent', border: 0, fontSize: 20, color: 'var(--muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {msg && (
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 700,
                background: msg.type === 'success' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
                color: msg.type === 'success' ? '#10B981' : '#EF4444',
                border: `1px solid ${msg.type === 'success' ? '#10B98144' : '#EF444444'}`
              }}>
                {msg.text}
              </div>
            )}

            {loadingDetail || !detail ? (
              <p style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Gerando links seguros e assinados do MinIO…</p>
            ) : (
              <div>
                {/* User & Document Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, background: 'var(--ground)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>NOME COMPLETO</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{detail.fullName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>CPF</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{detail.cpf}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TIPO E NÚMERO</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{detail.documentType} · {detail.documentNumber}</div>
                  </div>
                </div>

                {/* Secure Signed Images Display */}
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Imagens do Envio (URLs Presigned de Uso Único)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    {/* Front */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--ground)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Frente do Documento</div>
                      <img src={detail.frontUrl} alt="Frente Documento" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                    </div>

                    {/* Back */}
                    {detail.backUrl && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--ground)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Verso do Documento</div>
                        <img src={detail.backUrl} alt="Verso Documento" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                      </div>
                    )}

                    {/* Selfie */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10, background: 'var(--ground)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>Selfie Prova de Vida (Liveness)</div>
                      <img src={detail.selfieUrl} alt="Selfie Liveness" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }} />
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Observações de Compliance / Motivo de Rejeição
                  </label>
                  <textarea
                    rows={2}
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                    placeholder="Ex: Documento legível e selfie compatível / Foto com reflexo de luz na foto do RG..."
                    style={{
                      width: '100%', padding: 12, borderRadius: 10, border: '1px solid var(--border)',
                      background: 'var(--ground)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleReview('FRAUD')}
                    style={{
                      padding: '10px 18px', borderRadius: 10, border: '1px solid #DC2626',
                      background: 'rgba(220,38,38,.1)', color: '#DC2626', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <ShieldAlert size={16} />
                    Sinalizar Fraude
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleReview('REJECT')}
                    style={{
                      padding: '10px 18px', borderRadius: 10, border: '1px solid #EF4444',
                      background: 'rgba(239,68,68,.1)', color: '#EF4444', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8
                    }}
                  >
                    <XCircle size={16} />
                    Rejeitar KYC
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleReview('APPROVE')}
                    style={{
                      padding: '10px 22px', borderRadius: 10, border: 'none',
                      background: '#10B981', color: '#FFF', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,.3)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {actionLoading ? 'Processando…' : 'Aprovar KYC Nível 2'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
