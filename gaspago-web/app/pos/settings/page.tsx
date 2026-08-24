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

      {/* Asaas B2B Document Homologation */}
      <AsaasDocumentSection tokenKey={TOKEN_KEY} endpointPrefix="/pos/me" />

      {/* Notifications */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Notificações</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'not-allowed' }} title="Preferência de notificação ainda não é salva no servidor — em breve">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16,185,129,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={15} color="#10B981" />
          </div>
          <span style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500, flex: 1 }}>Receber notificações de novas cobranças (em breve)</span>
          <input
            type="checkbox"
            checked={notifications}
            disabled
            onChange={e => setNotifications(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--flame)', cursor: 'not-allowed' }}
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

function AsaasDocumentSection({ tokenKey, endpointPrefix }: { tokenKey: string; endpointPrefix: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  function loadDocuments() {
    setLoading(true)
    portalFetch(tokenKey, `${API}${endpointPrefix}/asaas-documents`)
      .then(r => r.json())
      .then(data => {
        if (data.documents) setDocs(data.documents)
        if (data.status) setStatus(data.status)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  function handleFileChange(docId: string, docType: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setMsg({ text: 'O arquivo deve ter no máximo 10MB.', type: 'error' })
      return
    }

    setUploadingId(docId)
    setMsg(null)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      try {
        const res = await portalFetch(tokenKey, `${API}${endpointPrefix}/asaas-documents/${docId}`, {
          method: 'POST',
          body: JSON.stringify({
            fileBase64: base64,
            type: docType,
            filename: file.name,
            mimeType: file.type,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setMsg({ text: `Documento "${file.name}" enviado com sucesso para análise no Asaas!`, type: 'success' })
          loadDocuments()
        } else {
          setMsg({ text: data.error || 'Erro ao enviar documento.', type: 'error' })
        }
      } catch {
        setMsg({ text: 'Erro de conexão ao enviar o documento.', type: 'error' })
      } finally {
        setUploadingId(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const isApproved = status?.generalApproval === 'APPROVED'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Homologação Asaas & Documentos B2B</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Envie a documentação da empresa para liberar saques e recebimentos na produção.</p>
        </div>
        <div style={{
          padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: isApproved ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)',
          color: isApproved ? '#10B981' : '#F59E0B', border: `1px solid ${isApproved ? '#10B98133' : '#F59E0B33'}`
        }}>
          {isApproved ? '✓ Conta Homologada' : '⏳ Homologação Pendente'}
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12.5, fontWeight: 600,
          background: msg.type === 'success' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
          color: msg.type === 'success' ? '#10B981' : '#EF4444',
          border: `1px solid ${msg.type === 'success' ? '#10B98133' : '#EF444433'}`
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', padding: '16px 0' }}>Carregando lista de documentos…</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {docs.map(doc => {
            const st = doc.status ?? 'NOT_SENT'
            const isDone = st === 'APPROVED'
            const isWait = st === 'AWAITING_APPROVAL'
            const isErr = st === 'REJECTED'

            const badgeBg = isDone ? 'rgba(16,185,129,.12)' : isWait ? 'rgba(59,130,246,.12)' : isErr ? 'rgba(239,68,68,.12)' : 'rgba(148,163,184,.12)'
            const badgeColor = isDone ? '#10B981' : isWait ? '#3B82F6' : isErr ? '#EF4444' : '#64748B'
            const badgeLabel = isDone ? 'Aprovado' : isWait ? 'Em Análise' : isErr ? 'Rejeitado' : 'Pendente'

            return (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--ground)' }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{doc.title}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: badgeBg, color: badgeColor }}>
                      {badgeLabel}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--muted)' }}>{doc.description}</p>
                  {doc.rejectionReason && (
                    <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4, fontWeight: 600 }}>Motivo: {doc.rejectionReason}</p>
                  )}
                </div>

                <div>
                  <label style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: uploadingId === doc.id ? 'wait' : 'pointer',
                    background: 'var(--flame)', color: '#FFF', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: uploadingId === doc.id ? .7 : 1
                  }}>
                    {uploadingId === doc.id ? 'Enviando…' : isDone ? 'Reenviar' : 'Enviar Arquivo'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={uploadingId === doc.id}
                      onChange={e => handleFileChange(doc.id, doc.type, e)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

