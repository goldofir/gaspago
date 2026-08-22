'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard Admin · Gás Pago',
  description: 'Painel administrativo do Gás Pago. Gerencie integrações, pedidos, distribuidoras, afiliados e receita da plataforma.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Coins, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { adminFetch } from '../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type CredStatus = { allSet: boolean; missing: string[] }

const integrations = [
  { key: 'asaas',    label: 'Asaas',         desc: 'Pagamentos e subcontas PIX' },
  { key: 'conexbot', label: 'Conexbot',       desc: 'Gateway WhatsApp / Meta' },
  { key: 'polygon',  label: 'Polygon / FGOL', desc: 'Contrato ERC-20' },
  { key: 'web3auth', label: 'Web3Auth',       desc: 'Carteiras embedded (MPC)' },
  { key: 'auth',     label: 'AutenticaÃ§Ã£o',  desc: 'JWT e sessÃµes' },
  { key: 'email',    label: 'E-mail SMTP',   desc: 'E-mails transacionais' },
]

const tokenMeta = [
  { label: 'Contrato',  value: '0xa1B7797F97eE6C928A6Ce0E403f345b68945C6D7' },
  { label: 'Rede',      value: 'Polygon PoS' },
  { label: 'Supply',    value: '1.000.000.000 FGOL' },
  { label: 'DEX Pools', value: 'FGOL/WETH Â· FGOL/WBTC (SushiSwap)' },
]

export default function DashboardPage() {
  const [creds, setCreds] = useState<CredStatus | null>(null)

  useEffect(() => {
    adminFetch(`${API}/admin/credentials/status`)
      .then(r => r.json()).then(setCreds).catch(() => {})
  }, [])

  const allSet = creds?.allSet ?? false
  const missing = creds?.missing ?? []

  return (
    <div>
      <style>{`
        .dash-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 12px;
        }
        .token-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .integ-card:hover {
          box-shadow: var(--shadow) !important;
          border-color: var(--flame) !important;
        }
        @media (max-width: 480px) {
          .token-grid { grid-template-columns: 1fr; }
          .dash-grid  { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          VisÃ£o geral
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1.2 }}>
          Dashboard
        </h1>
      </div>

      {/* Alert */}
      {creds && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 18px', borderRadius: 12, marginBottom: 24,
          background: allSet ? 'var(--green-dim)' : 'var(--red-dim)',
          border: `1px solid ${allSet ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
        }}>
          {allSet
            ? <CheckCircle2 size={17} color="var(--green)" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={17} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: allSet ? '#166534' : '#991B1B' }}>
              {allSet ? 'Todas as credenciais configuradas' : `${missing.length} credencial(is) ausente(s)`}
            </p>
            {!allSet && (
              <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 3, wordBreak: 'break-word' }}>
                {missing.join(', ')}
              </p>
            )}
          </div>
          {!allSet && (
            <Link href="/admin/credentials" style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
              color: 'var(--red)', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Configurar <ArrowRight size={12} />
            </Link>
          )}
        </div>
      )}

      {/* Integrations grid */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--sub)', marginBottom: 12, letterSpacing: '-.01em' }}>
          IntegraÃ§Ãµes
        </h2>
        <div className="dash-grid">
          {integrations.map(g => (
            <Link key={g.key} href="/admin/credentials" style={{ textDecoration: 'none' }}>
              <div className="integ-card" style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 16px',
                boxShadow: 'var(--shadow-sm)', transition: 'box-shadow .15s, border-color .15s',
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{g.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Token card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #627EEA 0%, #8B5CF6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Coins size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Token FGOL</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>ERC-20 Â· Polygon PoS</div>
          </div>
        </div>
        <div className="token-grid">
          {tokenMeta.map(x => (
            <div key={x.label} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-lt)',
              borderRadius: 9, padding: '11px 14px',
            }}>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>{x.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>{x.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
