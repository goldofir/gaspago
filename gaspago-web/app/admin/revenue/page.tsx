'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Receita',
  description: 'Relat�rios de receita e resultados financeiros da plataforma G�s Pago.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { TrendingUp, Coins, RefreshCw, ExternalLink, Inbox } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type Summary = {
  totalBrl: number
  totalFgol: number
  buybackCount: number
}

type RevenueRow = {
  source: string
  currency: string
  _sum: { amount: number | null }
}

type BuybackBatch = {
  id: string
  brlSpent: number
  fgolAcquired: number
  pricePerFgol: number
  polygonTxHash: string | null
  executedAt: string
  commissionsSettled: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  platform_cut: 'Corte plataforma',
  forfeited_commission: 'Comissão expirada',
  expired_premium: 'Premium expirado',
}

function fmtBrl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtFgol(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) + ' FGOL'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function shortenHash(hash: string) {
  if (hash.length <= 16) return hash
  return hash.slice(0, 8) + '...' + hash.slice(-6)
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [revenue, setRevenue] = useState<RevenueRow[]>([])
  const [buybacks, setBuybacks] = useState<BuybackBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [sumRes, revRes, bbRes] = await Promise.all([
          adminFetch(`${API}/admin/revenue/summary`).then(r => r.json()),
          adminFetch(`${API}/admin/revenue`).then(r => r.json()),
          adminFetch(`${API}/admin/revenue/buybacks`).then(r => r.json()),
        ])
        setSummary(sumRes)
        setRevenue(Array.isArray(revRes) ? revRes : [])
        setBuybacks(Array.isArray(bbRes) ? bbRes : [])
      } catch {
        // silent — UI shows zeros
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <style>{`
        .rev-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        .rev-table-wrap {
          overflow-x: auto;
        }
        .rev-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .rev-table th {
          text-align: left;
          padding: 11px 16px;
          font-size: 11px;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: .06em;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .rev-table td {
          padding: 13px 16px;
          color: var(--text);
          border-bottom: 1px solid var(--border-lt);
          white-space: nowrap;
        }
        .rev-table tr:last-child td {
          border-bottom: none;
        }
        .rev-table tbody tr:hover td {
          background: var(--surface-2);
        }
        .metric-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-bottom: 14px;
        }
        .hash-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--flame);
          text-decoration: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }
        .hash-link:hover { text-decoration: underline; }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        @media (max-width: 767px) {
          .rev-metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: 12, fontWeight: 600, color: 'var(--flame)',
          letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6,
        }}>
          Financeiro
        </p>
        <h1 style={{
          fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800,
          color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1.2,
        }}>
          Receita
        </h1>
      </div>

      {/* Top metrics */}
      <div className="rev-metrics">
        {/* Receita BRL Total */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '22px 24px', boxShadow: 'var(--shadow)',
        }}>
          <div className="metric-icon" style={{ background: 'var(--green-dim)' }}>
            <TrendingUp size={18} color="var(--green)" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Receita BRL Total
          </div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
            {loading ? '—' : fmtBrl(summary?.totalBrl ?? 0)}
          </div>
        </div>

        {/* FGOL Acumulado */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '22px 24px', boxShadow: 'var(--shadow)',
        }}>
          <div className="metric-icon" style={{ background: 'rgba(242,184,37,.12)' }}>
            <Coins size={18} color="var(--gold)" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            FGOL Acumulado
          </div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
            {loading ? '—' : fmtFgol(summary?.totalFgol ?? 0)}
          </div>
        </div>

        {/* Buybacks Executados */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '22px 24px', boxShadow: 'var(--shadow)',
        }}>
          <div className="metric-icon" style={{ background: 'var(--flame-dim)' }}>
            <RefreshCw size={18} color="var(--flame)" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Buybacks Executados
          </div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
            {loading ? '—' : (summary?.buybackCount ?? 0)}
          </div>
        </div>
      </div>

      {/* Revenue by source table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: 'var(--shadow)', marginBottom: 24, overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--surface-2)', padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Receita por Fonte</span>
        </div>
        <div className="rev-table-wrap">
          <table className="rev-table">
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Moeda</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 16px' }}>
                    Carregando...
                  </td>
                </tr>
              ) : revenue.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--muted)', textAlign: 'center', padding: '24px 16px' }}>
                    Nenhuma receita registrada
                  </td>
                </tr>
              ) : (
                revenue.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>
                      {SOURCE_LABELS[row.source] ?? row.source}
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: row.currency === 'BRL' ? 'var(--green-dim)' : 'rgba(242,184,37,.12)',
                        color: row.currency === 'BRL' ? 'var(--green)' : 'var(--gold)',
                      }}>
                        {row.currency}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                      {row.currency === 'BRL'
                        ? fmtBrl(row._sum.amount ?? 0)
                        : fmtFgol(row._sum.amount ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buyback history table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: 'var(--shadow)', overflow: 'hidden',
      }}>
        <div style={{
          background: 'var(--surface-2)', padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Histórico de Buybacks</span>
        </div>

        {loading ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Carregando...
          </div>
        ) : buybacks.length === 0 ? (
          <div style={{
            padding: '48px 20px', textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <Inbox size={32} color="var(--muted)" strokeWidth={1.5} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Nenhum buyback executado ainda</span>
          </div>
        ) : (
          <div className="rev-table-wrap">
            <table className="rev-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th style={{ textAlign: 'right' }}>BRL Gasto</th>
                  <th style={{ textAlign: 'right' }}>FGOL Adquirido</th>
                  <th style={{ textAlign: 'right' }}>Preço/FGOL</th>
                  <th style={{ textAlign: 'center' }}>Comissões</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {buybacks.map(b => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--sub)' }}>{fmtDate(b.executedAt)}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                      {fmtBrl(b.brlSpent)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                      {b.fgolAcquired.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono',monospace" }}>
                      R$ {b.pricePerFgol.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{
                        background: b.commissionsSettled ? 'var(--green-dim)' : 'var(--amber-dim)',
                        color: b.commissionsSettled ? 'var(--green)' : 'var(--amber)',
                      }}>
                        {b.commissionsSettled ? 'Liquidadas' : 'Pendente'}
                      </span>
                    </td>
                    <td>
                      {b.polygonTxHash ? (
                        <a
                          className="hash-link"
                          href={`https://polygonscan.com/tx/${b.polygonTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {shortenHash(b.polygonTxHash)}
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
