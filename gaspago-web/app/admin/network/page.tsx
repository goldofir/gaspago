'use client'

import { useEffect, useState } from 'react'
import { Users, ChevronRight, ChevronDown, Network, Settings2 } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

type RootRow = {
  matrixPositionId: string
  userId: string
  name: string | null
  phone: string
  actorType: string | null
  directCount: number
  totalCount: number
  createdAt: string
}

type TreeNode = {
  id: string
  userId: string
  name: string | null
  phone: string
  level: number
  position: number
  affiliateStatus: string | null
  children: TreeNode[]
}

function TreeRow({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(node.level <= 2)
  const hasChildren = node.children.length > 0
  return (
    <div>
      <div
        onClick={() => hasChildren && setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
          borderRadius: 8, cursor: hasChildren ? 'pointer' : 'default',
          background: node.level === 1 ? 'rgba(255,101,36,.06)' : 'transparent',
        }}
      >
        {hasChildren ? (open ? <ChevronDown size={14} color="var(--muted)" /> : <ChevronRight size={14} color="var(--muted)" />) : <span style={{ width: 14 }} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--flame)', background: 'rgba(255,101,36,.1)', padding: '1px 7px', borderRadius: 20 }}>N{node.level}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{node.name || node.phone}</span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{node.phone}</span>
        {node.affiliateStatus && node.affiliateStatus !== 'ACTIVE' && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--amber)', background: 'var(--amber-dim)', padding: '1px 6px', borderRadius: 20 }}>
            {node.affiliateStatus}
          </span>
        )}
        {hasChildren && <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{node.children.length} indicado{node.children.length !== 1 ? 's' : ''}</span>}
      </div>
      {open && hasChildren && (
        <div style={{ marginLeft: 26, borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
          {node.children.map(c => <TreeRow key={c.id} node={c} />)}
        </div>
      )}
    </div>
  )
}

export default function AdminNetworkPage() {
  const [roots, setRoots] = useState<RootRow[]>([])
  const [loadingRoots, setLoadingRoots] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tree, setTree] = useState<TreeNode | null>(null)
  const [loadingTree, setLoadingTree] = useState(false)

  const [width, setWidth] = useState('')
  const [depth, setDepth] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configMsg, setConfigMsg] = useState('')

  useEffect(() => {
    adminFetch(`${API}/affiliates/roots`)
      .then(r => r.json())
      .then(data => {
        setRoots(Array.isArray(data) ? data : [])
        if (Array.isArray(data) && data.length > 0) setSelectedId(data[0].userId)
      })
      .finally(() => setLoadingRoots(false))

    adminFetch(`${API}/admin/credentials`)
      .then(r => r.json())
      .then(data => {
        const flat = Object.values(data.grouped ?? {}).flat() as { key: string; value: string }[]
        setWidth(flat.find(c => c.key === 'MATRIX_WIDTH')?.value || '5')
        setDepth(flat.find(c => c.key === 'MATRIX_DEPTH')?.value || '5')
      })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoadingTree(true)
    setTree(null)
    adminFetch(`${API}/affiliates/${selectedId}/network`)
      .then(r => r.json())
      .then(setTree)
      .finally(() => setLoadingTree(false))
  }, [selectedId])

  async function saveConfig() {
    setSavingConfig(true)
    setConfigMsg('')
    try {
      await Promise.all([
        adminFetch(`${API}/admin/credentials/MATRIX_WIDTH`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: width }) }),
        adminFetch(`${API}/admin/credentials/MATRIX_DEPTH`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: depth }) }),
      ])
      setConfigMsg('Salvo — vale a partir do próximo cadastro.')
    } catch {
      setConfigMsg('Erro ao salvar.')
    } finally {
      setSavingConfig(false)
      setTimeout(() => setConfigMsg(''), 4000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Rede</div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>Matriz de Afiliados</h1>
          <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--sub)' }}>Toda a rede de indicação sendo formada — cada raiz é um ciclo independente (inclui reentradas).</p>
        </div>

        {/* Config */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
          <Settings2 size={18} color="var(--muted)" style={{ marginBottom: 8 }} />
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Largura</label>
            <input value={width} onChange={e => setWidth(e.target.value)} style={{ width: 70, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Profundidade</label>
            <input value={depth} onChange={e => setDepth(e.target.value)} style={{ width: 70, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }} />
          </div>
          <button onClick={saveConfig} disabled={savingConfig} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--flame)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', opacity: savingConfig ? 0.7 : 1 }}>
            {savingConfig ? 'Salvando…' : 'Salvar'}
          </button>
          {configMsg && <span style={{ fontSize: 12.5, color: 'var(--sub)' }}>{configMsg}</span>}
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
            Comissões por nível, cashback e código da empresa: <a href="/admin/credentials" style={{ color: 'var(--flame)', fontWeight: 600 }}>Credenciais → Comissões</a>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'flex-start' }}>
          {/* Roots list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Raízes ({roots.length})
            </div>
            {loadingRoots ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando…</div>
            ) : roots.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <Network size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Nenhuma rede formada ainda.</div>
              </div>
            ) : (
              <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                {roots.map(r => (
                  <div
                    key={r.matrixPositionId}
                    onClick={() => setSelectedId(r.userId)}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-lt, var(--border))',
                      background: selectedId === r.userId ? 'rgba(255,101,36,.06)' : 'transparent',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{r.name || r.phone}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{r.actorType ?? 'CONSUMER'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--sub)', marginTop: 4 }}>
                      <Users size={11} /> {r.directCount} diretos · {r.totalCount} no total
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tree */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, minHeight: 200 }}>
            {loadingTree ? (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 24 }}>Carregando árvore…</div>
            ) : tree ? (
              <TreeRow node={tree} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 24 }}>Selecione uma raiz pra ver a árvore.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
