'use client'

import { useState, useEffect } from 'react'
import { adminFetch } from '../../_components/adminFetch'
import {
  Building2,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  Wallet,
  Loader2,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface CompanyData {
  razaoSocial: string
  cnpj: string
  inscricaoEstadual: string
  email: string
  phone: string
  address: string
  responsavelNome: string
  responsavelCpf: string
  treasuryWallet: string
}

export default function AdminProfilePage() {
  const [form, setForm] = useState<CompanyData>({
    razaoSocial: '',
    cnpj: '',
    inscricaoEstadual: '',
    email: '',
    phone: '',
    address: '',
    responsavelNome: '',
    responsavelCpf: '',
    treasuryWallet: '',
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const fetchCompanyData = async () => {
    setLoading(true)
    try {
      const res = await adminFetch(`${API}/admin/company`)
      if (res.ok) {
        const data = await res.json()
        setForm(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanyData()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    try {
      const res = await adminFetch(`${API}/admin/company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar dados')

      setMsg({ text: 'Dados da empresa salvos com sucesso!', type: 'success' })
    } catch (err: any) {
      setMsg({ text: err.message || 'Erro ao salvar.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAutoFillCnpj = async () => {
    const cleanCnpj = form.cnpj.replace(/\D/g, '')
    if (cleanCnpj.length !== 14) {
      setMsg({ text: 'Digite um CNPJ válido com 14 dígitos.', type: 'error' })
      return
    }

    setAuditLoading(true)
    setMsg(null)

    try {
      const res = await adminFetch(`${API}/admin/ecac/cnpj-audit/${cleanCnpj}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.message || 'CNPJ não encontrado na Receita Federal.')

      const fullAddress = `${data.endereco.logradouro}, ${data.endereco.numero} - ${data.endereco.bairro}, ${data.endereco.municipio}/${data.endereco.uf} - CEP: ${data.endereco.cep}`

      setForm((prev) => ({
        ...prev,
        razaoSocial: data.razaoSocial || prev.razaoSocial,
        address: fullAddress || prev.address,
      }))

      setMsg({ text: 'Dados da Receita Federal importados com sucesso!', type: 'success' })
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' })
    } finally {
      setAuditLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 40, color: 'var(--sub)' }}>
        <Loader2 className="animate-spin" size={20} />
        Carregando perfil da empresa...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 840 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Institucional
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', margin: 0 }}>
          Perfil da Empresa & Configurações
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
          Gerencie os dados cadastrais da Gás Pago Tecnologia LTDA utilizados em contratos, e-CAC e homologações B2B.
        </p>
      </div>

      {msg && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            background: msg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: msg.type === 'success' ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Bloco 1: Identificação da Empresa */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <Building2 size={20} color="var(--flame)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Dados Cadastrais da Empresa
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                Razão Social
              </label>
              <input
                type="text"
                value={form.razaoSocial}
                onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
                placeholder="GÁS PAGO TECNOLOGIA LTDA"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                CNPJ
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
                  required
                />
                <button
                  type="button"
                  onClick={handleAutoFillCnpj}
                  disabled={auditLoading}
                  title="Auto-preencher com dados da Receita Federal"
                  style={{
                    padding: '0 12px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <Search size={14} />
                  {auditLoading ? '...' : 'Receita'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                Inscrição Estadual (IE)
              </label>
              <input
                type="text"
                value={form.inscricaoEstadual}
                onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })}
                placeholder="ISENTO ou número"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                Endereço Completo da Sede
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Paulista, 1000 - São Paulo/SP - CEP: 01310-100"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Contato & Responsável Legal */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <UserCheck size={20} color="var(--flame)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Contato & Responsável Legal (Receita Federal / e-CAC)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                E-mail Institucional
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="contato@gaspago.com.br"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                Nome do Responsável Legal
              </label>
              <input
                type="text"
                value={form.responsavelNome}
                onChange={(e) => setForm({ ...form, responsavelNome: e.target.value })}
                placeholder="Nome completo do responsável"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
                CPF do Responsável Legal
              </label>
              <input
                type="text"
                value={form.responsavelCpf}
                onChange={(e) => setForm({ ...form, responsavelCpf: e.target.value })}
                placeholder="000.000.000-00"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Bloco 3: Tesouraria Web3 (Polygon) */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Wallet size={20} color="var(--gold)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              Carteira Oficial da Tesouraria (Polygon / FGOL)
            </h3>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}>
              Endereço da Wallet Pública da Empresa (0x...)
            </label>
            <input
              type="text"
              value={form.treasuryWallet}
              onChange={(e) => setForm({ ...form, treasuryWallet: e.target.value })}
              placeholder="0x0000000000000000000000000000000000000000"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
            />
          </div>
        </div>

        {/* Botão de Salvar */}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '14px 24px', borderRadius: 12, background: 'var(--flame)', color: '#fff',
            fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'var(--shadow)'
          }}
        >
          <Save size={18} />
          {saving ? 'Salvações em andamento...' : 'Salvar Alterações do Perfil'}
        </button>
      </form>
    </div>
  )
}
