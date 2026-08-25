'use client'

import { useEffect, useState } from 'react'
import { UserCircle, ShieldCheck, Star, Loader2, Check, Copy, Upload } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'
const TOKEN_KEY = 'gp_consumer_token'

type Me = { id: string; name: string | null; phone: string; email: string | null; cpf: string | null }
type SubInfo = { plan: string; status: string; expiresAt: string | null }
type PlanOption = { id: string; name: string; slug: string; price: number; billingCycle: string; features: string[] }

type KycSubmission = {
  id: string; status: string; targetLevel: string; documentType: string
  rejectionReason: string | null; submittedAt: string; reviewedAt: string | null
} | null
type KycStatusResp = { userId: string; kycVerified: boolean; kycLevel: string; status: string; submission: KycSubmission }

const KYC_STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: 'Não enviado', PENDING_REVIEW: 'Em análise', IN_AUTOMATED_CHECK: 'Em análise',
  APPROVED: 'Aprovado', REJECTED: 'Recusado', SUSPECTED_FRAUD: 'Em análise',
}
const KYC_STATUS_COLOR: Record<string, string> = {
  NOT_SUBMITTED: 'var(--muted)', PENDING_REVIEW: 'var(--amber)', IN_AUTOMATED_CHECK: 'var(--amber)',
  APPROVED: 'var(--green)', REJECTED: 'var(--red)', SUSPECTED_FRAUD: 'var(--amber)',
}
const KYC_LEVEL_LABEL: Record<string, string> = {
  LEVEL_0_UNVERIFIED: 'Não verificado — saques indisponíveis',
  LEVEL_1_BASIC: 'Básico — até R$ 500/mês em saques',
  LEVEL_2_VERIFIED: 'Verificado — até R$ 10.000/mês em saques',
  LEVEL_3_ENTERPRISE: 'Enterprise — sem limite',
}

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface-2)' }
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--sub)', display: 'block', marginBottom: 5 }

export default function PerfilPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [profileError, setProfileError] = useState('')

  const [kyc, setKyc] = useState<KycStatusResp | null>(null)
  const [kycForm, setKycForm] = useState({ documentType: 'RG', documentNumber: '', fullName: '', birthDate: '' })
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [submittingKyc, setSubmittingKyc] = useState(false)
  const [kycError, setKycError] = useState('')

  const [sub, setSub] = useState<SubInfo | null>(null)
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [upgradingId, setUpgradingId] = useState<string | null>(null)
  const [pixCode, setPixCode] = useState<string | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [upgradeError, setUpgradeError] = useState('')

  function loadMe() {
    fetch(`${API}/auth/me`, { headers: authHeaders() }).then(r => r.json()).then(d => {
      setMe(d)
      setName(d.name ?? '')
      setEmail(d.email ?? '')
      setCpf(d.cpf ?? '')
    }).catch(() => {})
  }

  function loadKyc() {
    fetch(`${API}/kyc/status`, { headers: authHeaders() }).then(r => r.json()).then(setKyc).catch(() => {})
  }

  useEffect(() => {
    loadMe()
    loadKyc()
    fetch(`${API}/subscriptions/me`, { headers: authHeaders() }).then(r => r.json()).then(setSub).catch(() => {})
    fetch(`${API}/subscriptions/plans`).then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setProfileMsg('')
    setSavingProfile(true)
    try {
      const body: Record<string, string> = {}
      if (name.trim() && name.trim() !== (me?.name ?? '')) body.name = name.trim()
      if (email.trim() && email.trim() !== (me?.email ?? '')) body.email = email.trim()
      const cpfDigits = cpf.replace(/\D/g, '')
      if (cpfDigits && cpfDigits !== (me?.cpf ?? '')) body.cpf = cpfDigits

      const res = await fetch(`${API}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível salvar.')
      setProfileMsg('Salvo!')
      loadMe()
      setTimeout(() => setProfileMsg(''), 2500)
    } catch (err: any) {
      setProfileError(err.message ?? 'Erro ao salvar.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSubmitKyc(e: React.FormEvent) {
    e.preventDefault()
    setKycError('')
    if (!frontFile || !selfieFile) {
      setKycError('Envie a foto do documento e a selfie.')
      return
    }
    if (!kycForm.documentNumber.trim() || !kycForm.fullName.trim()) {
      setKycError('Preencha o número do documento e o nome completo.')
      return
    }
    const cpfDigits = (me?.cpf ?? cpf).replace(/\D/g, '')
    if (cpfDigits.length !== 11) {
      setKycError('Salve um CPF válido no seu perfil antes de enviar a verificação.')
      return
    }
    setSubmittingKyc(true)
    try {
      const [frontImageBase64, backImageBase64, selfieImageBase64] = await Promise.all([
        fileToBase64(frontFile),
        backFile ? fileToBase64(backFile) : Promise.resolve(undefined),
        fileToBase64(selfieFile),
      ])
      const res = await fetch(`${API}/kyc/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          documentType: kycForm.documentType,
          documentNumber: kycForm.documentNumber.trim(),
          fullName: kycForm.fullName.trim(),
          cpf: cpfDigits,
          birthDate: kycForm.birthDate || undefined,
          frontImageBase64,
          backImageBase64,
          selfieImageBase64,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível enviar a verificação.')
      loadKyc()
      setFrontFile(null)
      setBackFile(null)
      setSelfieFile(null)
    } catch (err: any) {
      setKycError(err.message ?? 'Erro ao enviar.')
    } finally {
      setSubmittingKyc(false)
    }
  }

  function copyPix() {
    if (!pixCode) return
    navigator.clipboard.writeText(pixCode)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2000)
  }

  async function handleUpgrade(planId: string) {
    const cpfDigits = (me?.cpf ?? cpf).replace(/\D/g, '')
    if (!me?.cpf && cpfDigits.length !== 11) {
      setUpgradeError('Salve um CPF válido acima antes de assinar (necessário pro PIX).')
      return
    }
    setUpgradeError('')
    setPixCode(null)
    setUpgradingId(planId)
    try {
      const res = await fetch(`${API}/subscriptions/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ planId, cpf: me?.cpf ? undefined : cpfDigits }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível assinar.')
      if (data?.pixQrCode) setPixCode(data.pixQrCode)
    } catch (err: any) {
      setUpgradeError(err.message ?? 'Erro ao assinar.')
    } finally {
      setUpgradingId(null)
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text)', maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Minha conta</p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>Perfil & KYC</h1>
      </div>

      {/* Profile */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <UserCircle size={16} color="var(--flame)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Dados pessoais</span>
        </div>
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
            <label>
              <span style={labelStyle}>Nome completo</span>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Seu nome" />
            </label>
            <label>
              <span style={labelStyle}>Telefone</span>
              <input value={me?.phone ?? ''} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
            </label>
            <label>
              <span style={labelStyle}>E-mail</span>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle} placeholder="voce@email.com" />
            </label>
            <label>
              <span style={labelStyle}>CPF</span>
              <input value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }} placeholder="000.000.000-00" />
            </label>
          </div>
          {profileError && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>{profileError}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="submit" disabled={savingProfile} style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: savingProfile ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {savingProfile && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />} Salvar
            </button>
            {profileMsg && <span style={{ fontSize: 12.5, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}><Check size={13} /> {profileMsg}</span>}
          </div>
        </form>
      </div>

      {/* KYC */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} color="var(--flame)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Verificação de identidade (KYC)</span>
          </div>
          {kyc && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: KYC_STATUS_COLOR[kyc.status], background: `${KYC_STATUS_COLOR[kyc.status]}18`, padding: '3px 10px', borderRadius: 20 }}>
              {KYC_STATUS_LABEL[kyc.status] ?? kyc.status}
            </span>
          )}
        </div>
        {kyc && (
          <div style={{ fontSize: 12.5, color: 'var(--sub)', marginBottom: 16 }}>{KYC_LEVEL_LABEL[kyc.kycLevel] ?? kyc.kycLevel}</div>
        )}
        {kyc?.submission?.status === 'REJECTED' && kyc.submission.rejectionReason && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--red)', marginBottom: 16 }}>
            Motivo da recusa: {kyc.submission.rejectionReason}
          </div>
        )}

        {kyc?.status === 'APPROVED' ? (
          <div style={{ fontSize: 13, color: 'var(--green)' }}>Identidade verificada — saques via PIX liberados dentro do seu limite.</div>
        ) : kyc?.status === 'PENDING_REVIEW' || kyc?.status === 'IN_AUTOMATED_CHECK' ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sua verificação está em análise — normalmente leva até 1 dia útil.</div>
        ) : (
          <form onSubmit={handleSubmitKyc}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
              <label>
                <span style={labelStyle}>Tipo de documento</span>
                <select value={kycForm.documentType} onChange={e => setKycForm(f => ({ ...f, documentType: e.target.value }))} style={inputStyle}>
                  <option value="RG">RG</option>
                  <option value="CNH">CNH</option>
                  <option value="PASSPORT">Passaporte</option>
                </select>
              </label>
              <label>
                <span style={labelStyle}>Número do documento</span>
                <input value={kycForm.documentNumber} onChange={e => setKycForm(f => ({ ...f, documentNumber: e.target.value }))} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Nome completo (como no documento)</span>
                <input value={kycForm.fullName} onChange={e => setKycForm(f => ({ ...f, fullName: e.target.value }))} style={inputStyle} />
              </label>
              <label>
                <span style={labelStyle}>Data de nascimento</span>
                <input type="date" value={kycForm.birthDate} onChange={e => setKycForm(f => ({ ...f, birthDate: e.target.value }))} style={inputStyle} />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
              <label>
                <span style={labelStyle}>Foto do documento (frente)</span>
                <input type="file" accept="image/*" onChange={e => setFrontFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
              </label>
              <label>
                <span style={labelStyle}>Foto do documento (verso, opcional)</span>
                <input type="file" accept="image/*" onChange={e => setBackFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
              </label>
              <label>
                <span style={labelStyle}>Selfie segurando o documento</span>
                <input type="file" accept="image/*" onChange={e => setSelfieFile(e.target.files?.[0] ?? null)} style={{ fontSize: 12.5 }} />
              </label>
            </div>

            {kycError && <div style={{ color: 'var(--red)', fontSize: 12.5, marginBottom: 12 }}>{kycError}</div>}

            <button type="submit" disabled={submittingKyc} style={{ padding: '9px 18px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: submittingKyc ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {submittingKyc ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />} Enviar verificação
            </button>
          </form>
        )}
      </div>

      {/* Plan */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Star size={16} color="var(--flame)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.03em' }}>Plano</span>
        </div>
        {sub?.plan && sub.plan !== 'FREE' ? (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{sub.plan}</div>
            {sub.expiresAt && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>Renova em {new Date(sub.expiresAt).toLocaleDateString('pt-BR')}</div>}
          </div>
        ) : plans.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum plano disponível no momento.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plans.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-lt)' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{p.billingCycle === 'YEARLY' ? 'ano' : 'mês'}</div>
                </div>
                <button onClick={() => handleUpgrade(p.id)} disabled={upgradingId === p.id} style={{ padding: '7px 14px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', opacity: upgradingId === p.id ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {upgradingId === p.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null} Assinar
                </button>
              </div>
            ))}
            {upgradeError && <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{upgradeError}</div>}
            {pixCode && (
              <div style={{ marginTop: 4, padding: 12, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-lt)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Código PIX (copia e cola)</div>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'var(--sub)', wordBreak: 'break-all', marginBottom: 8 }}>{pixCode}</div>
                <button onClick={copyPix} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: pixCopied ? 'var(--green)' : 'var(--flame)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {pixCopied ? <Check size={12} /> : <Copy size={12} />} {pixCopied ? 'Copiado!' : 'Copiar código PIX'}
                </button>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>Assinatura criada — aguarde a confirmação do pagamento.</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
