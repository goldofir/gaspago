'use client'

import { useState, useEffect } from 'react'
import { adminFetch } from '../../_components/adminFetch'
import {
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface In1888Summary {
  year: number
  month: number
  totalVolumeBrl: number
  thresholdBrl: number
  requiresDeclaration: boolean
  operationsCount: number
  certificateA1Configured: boolean
}

interface CnpjAuditResult {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  situacaoCadastral: string
  isGasVendorEligible: boolean
  cnaeFiscalPrincipal: { codigo: number; descricao: string }
  endereco: { municipio: string; uf: string }
}

export default function AdminEcacPage() {
  const [summary, setSummary] = useState<In1888Summary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  const [cnpjInput, setCnpjInput] = useState('')
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditResult, setAuditResult] = useState<CnpjAuditResult | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)

  const fetchSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await adminFetch(`${API}/admin/ecac/in1888/summary`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingSummary(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const handleAuditCnpj = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cnpjInput.trim()) return

    setAuditLoading(true)
    setAuditResult(null)
    setAuditError(null)

    try {
      const clean = cnpjInput.replace(/\D/g, '')
      const res = await adminFetch(`${API}/admin/ecac/cnpj-audit/${clean}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao consultar CNPJ')
      }
      setAuditResult(data)
    } catch (err: any) {
      setAuditError(err.message)
    } finally {
      setAuditLoading(false)
    }
  }

  const handleDownloadXml = async () => {
    try {
      const res = await adminFetch(`${API}/admin/ecac/in1888/export-xml`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Declaracao_IN1888_${summary?.year}_${summary?.month}.xml`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      alert('Erro ao baixar arquivo XML da IN 1888')
    }
  }

  const volumePct = Math.min(
    100,
    Math.round(((summary?.totalVolumeBrl ?? 0) / (summary?.thresholdBrl ?? 30000)) * 100)
  )

  return (
    <div>
      <style>{`
        .ecac-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 767px) {
          .ecac-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .ecac-card {
            padding: 10px 12px !important;
          }
          .ecac-card p {
            font-size: 16px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Fiscal & Governança
          </p>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
            Compliance e-CAC · IN 1888 RFB
          </h1>
        </div>
        <button
          onClick={fetchSummary}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9,
            background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--text)'
          }}
        >
          <RefreshCw size={14} className={loadingSummary ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Info Card */}
      <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <Info size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>
            Instrução Normativa RFB nº 1888/2019 (e-CAC) — Residentes no Brasil
          </h4>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#334155', lineHeight: 1.4 }}>
            Empresas e usuários com domicilio fiscal no Brasil que movimentam criptoativos acima de <strong>R$ 30.000,00/mês</strong> devem declarar mensalmente à Receita Federal via e-CAC (Art. 6º).
          </p>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '2px 8px', borderRadius: 6, display: 'inline-block' }}>
            🇧🇷 Aplica-se exclusivamente a CPF/CNPJ brasileiros · Estrangeiros (não-residentes) possuem isenção automática.
          </span>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="ecac-kpi-grid">
        {/* Movimentação Mensal */}
        <div className="ecac-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--flame)', marginBottom: 6 }}>
            <FileText size={16} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Volume Mensal FGOL</span>
          </div>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
            R$ {(summary?.totalVolumeBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div style={{ width: '100%', background: 'var(--border)', height: 6, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${volumePct}%`, background: summary?.requiresDeclaration ? '#EF4444' : '#22C55E', height: '100%' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
            {volumePct}% do limite de R$ 30.000
          </span>
        </div>

        {/* Status e-CAC */}
        <div className="ecac-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: summary?.requiresDeclaration ? '#EF4444' : '#22C55E', marginBottom: 6 }}>
            {summary?.requiresDeclaration ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Status e-CAC</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: summary?.requiresDeclaration ? '#EF4444' : '#22C55E', margin: '0 0 4px' }}>
            {summary?.requiresDeclaration ? 'Declaração Obrigatória' : 'Isento (< R$ 30k)'}
          </p>
          <span style={{ fontSize: 12, color: 'var(--sub)' }}>
            {summary?.operationsCount ?? 0} operações em {summary?.month}/{summary?.year}
          </span>
        </div>

        {/* Exportar XML */}
        <div className="ecac-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3B82F6', marginBottom: 6 }}>
              <ShieldCheck size={16} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>Arquivo RFB</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)', margin: 0 }}>Layout Oficial IN 1888</p>
          </div>
          <button
            onClick={handleDownloadXml}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
              padding: '8px 14px', borderRadius: 9, background: 'var(--navy)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', marginTop: 10
            }}
          >
            <Download size={14} />
            Baixar XML IN 1888
          </button>
        </div>
      </div>

      {/* Consulta CNPJ Gratuita Receita Federal */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Building2 size={20} color="var(--flame)" />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            Consulta de CNPJ na Receita Federal (Gratuita)
          </h3>
        </div>

        <form onSubmit={handleAuditCnpj} style={{ display: 'flex', gap: 10, maxWidth: 540, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Digite o CNPJ da Distribuidora (ex: 00.000.000/0001-00)"
            value={cnpjInput}
            onChange={(e) => setCnpjInput(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border)',
              fontSize: 14, outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={auditLoading}
            style={{
              padding: '10px 18px', borderRadius: 9, background: 'var(--flame)', color: '#fff',
              fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Search size={14} />
            {auditLoading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>

        {auditError && (
          <div style={{ padding: '12px 16px', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            {auditError}
          </div>
        )}

        {auditResult && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                {auditResult.razaoSocial}
              </h4>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: auditResult.situacaoCadastral === 'ATIVA' ? 'var(--green-dim)' : 'var(--red-dim)', color: auditResult.situacaoCadastral === 'ATIVA' ? 'var(--green)' : 'var(--red)' }}>
                {auditResult.situacaoCadastral}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13, color: 'var(--sub)' }}>
              <div>
                <strong>CNPJ:</strong> {auditResult.cnpj}
              </div>
              <div>
                <strong>Município / UF:</strong> {auditResult.endereco.municipio} / {auditResult.endereco.uf}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>CNAE Principal:</strong> {auditResult.cnaeFiscalPrincipal.codigo} - {auditResult.cnaeFiscalPrincipal.descricao}
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 6 }}>
                <strong>Elegibilidade Gás GLP:</strong>{' '}
                {auditResult.isGasVendorEligible ? (
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>✅ CNAE Autorizado para Distribuição de GLP</span>
                ) : (
                  <span style={{ color: 'var(--amber)', fontWeight: 700 }}>⚠️ CNAE Secundário necessário para venda de GLP</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
