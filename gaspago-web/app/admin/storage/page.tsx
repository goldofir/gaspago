'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Storage',
  description: 'Gerenciamento de arquivos e m�dias armazenadas na plataforma.',
  robots: { index: false, follow: false },
}

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, RefreshCw, FileImage, Lock, Globe, Trash2, Layers } from 'lucide-react'
import Link from 'next/link'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type StatusData = { ok: boolean; endpoint?: string; publicBucket?: string; privateBucket?: string; error?: string }

const policies = [
  { Icon: FileImage, label: 'Compressão automática',   desc: 'WebP · qualidade 82 · máx. 1920×1920 px' },
  { Icon: Layers,    label: 'Thumbnail',                desc: '300×300 px gerado para produtos e perfis' },
  { Icon: Globe,     label: 'Bucket público',           desc: 'Logos, produtos e fotos de estabelecimentos' },
  { Icon: Lock,      label: 'Bucket privado',           desc: 'Documentos KYC — URL pré-assinada (15 min)' },
  { Icon: Trash2,    label: 'Substituição sem duplicatas', desc: 'Imagem antiga deletada antes de subir a nova' },
]

export default function StoragePage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [checking, setChecking] = useState(true)

  const check = async () => {
    setChecking(true)
    adminFetch(`${API}/admin/storage/status`)
      .then(r => r.json()).then(d => { setStatus(d); setChecking(false) })
      .catch(() => { setStatus({ ok: false, error: 'Não foi possível conectar à API' }); setChecking(false) })
  }

  useEffect(() => { check() }, [])

  return (
    <div style={{ maxWidth: 860 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Infraestrutura
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
          Storage
        </h1>
        <p style={{ color: 'var(--sub)', marginTop: 8, fontSize: 14 }}>
          MinIO S3-compatible. Configure as credenciais em{' '}
          <Link href="/admin/credentials" style={{ color: 'var(--flame)', fontWeight: 500 }}>Credenciais</Link>.
        </p>
      </div>

      {/* Status card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)', marginBottom: 16,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Conexão MinIO</span>
          <button onClick={check} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)',
            fontSize: 12, fontWeight: 500, color: 'var(--sub)', cursor: 'pointer',
          }}>
            <RefreshCw size={11} style={checking ? { animation: 'spin 1s linear infinite' } : {}} />
            Verificar
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {checking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Verificando conexão…
            </div>
          ) : status?.ok ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <CheckCircle2 size={18} color="var(--green)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>Conectado com sucesso</span>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { k: 'Endpoint',        v: status.endpoint },
                  { k: 'Bucket público',  v: status.publicBucket },
                  { k: 'Bucket privado',  v: status.privateBucket },
                ].map(r => (
                  <div key={r.k} style={{
                    display: 'grid', gridTemplateColumns: '130px 1fr',
                    alignItems: 'center', padding: '10px 14px',
                    background: 'var(--surface-2)', borderRadius: 9,
                    border: '1px solid var(--border-lt)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{r.k}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text)' }}>{r.v ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <XCircle size={18} color="var(--red)" />
              <span style={{ fontSize: 13, color: '#991B1B', fontWeight: 500 }}>{status?.error ?? 'Não configurado'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Policies */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)',
      }}>
        <div style={{ padding: '14px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Política de arquivos</span>
        </div>
        {policies.map(({ Icon, label, desc }, i) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 20px',
            borderBottom: i < policies.length - 1 ? '1px solid var(--border-lt)' : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: 'var(--flame-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color="var(--flame)" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
