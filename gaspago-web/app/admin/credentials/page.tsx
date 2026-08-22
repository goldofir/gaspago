'use client'
import { useState, useEffect } from 'react'
import { Check, AlertCircle, Eye, EyeOff, Save, RefreshCw, Lock, FlaskConical, Rocket, Pencil, X } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

const TOGGLE_KEYS: Record<string, { options: { value: string; label: string; desc: string; Icon: React.ElementType; color: string }[] }> = {
  ASAAS_ENV: {
    options: [
      { value: 'sandbox',    label: 'Sandbox',  desc: 'sandbox.asaas.com', Icon: FlaskConical, color: '#D97706' },
      { value: 'production', label: 'Produção', desc: 'api.asaas.com',     Icon: Rocket,       color: '#16A34A' },
    ],
  },
}

const GROUP_META: Record<string, { label: string; desc: string; color: string }> = {
  asaas:    { label: 'Asaas',          desc: 'Pagamentos PIX e subcontas',    color: '#0891B2' },
  conexbot: { label: 'Conexbot',        desc: 'WhatsApp · app.conext.click/api/v1', color: '#16A34A' },
  polygon:  { label: 'Polygon / FGOL', desc: 'RPC, contrato e wallet',         color: '#7C3AED' },
  web3auth: { label: 'Web3Auth',        desc: 'Carteiras embedded (MPC)',       color: '#EA580C' },
  auth:     { label: 'Autenticação',   desc: 'JWT e chaves de sessão',         color: '#DC2626' },
  email:    { label: 'E-mail SMTP',    desc: 'Servidor de envio',              color: '#0284C7' },
  google:   { label: 'Google OAuth',   desc: 'Login social',                   color: '#4285F4' },
}

type Credential = {
  key: string; label: string; group: string; sensitive: boolean
  hint?: string; isSet: boolean; value?: string | null; readonly?: boolean
}

function Badge({ isSet }: { isSet: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
      background: isSet ? 'var(--green-dim)' : 'var(--red-dim)',
      color: isSet ? '#166534' : '#991B1B',
      border: `1px solid ${isSet ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSet ? 'var(--green)' : 'var(--red)', display: 'inline-block', flexShrink: 0 }} />
      {isSet ? 'Configurado' : 'Ausente'}
    </span>
  )
}

export default function CredentialsPage() {
  const [data, setData] = useState<{ grouped: Record<string, Credential[]>; allSet: boolean; missing: string[] } | null>(null)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch(`${API}/admin/credentials`)
      if (res.status === 401) {
        // adminFetch already redirected to /login — nothing left to render here
        return
      }
      if (!res.ok) {
        throw new Error(`Servidor retornou status ${res.status}`)
      }
      const json = await res.json()
      if (json && json.grouped) {
        setData(json)
      } else {
        throw new Error('Resposta de credenciais inválida do servidor')
      }
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao conectar com o servidor API')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // For toggle keys with an implicit default (e.g. ASAAS_ENV=sandbox),
  // pre-select the default in local state so the toggle shows as active
  // without requiring the admin to click it first.
  useEffect(() => {
    if (!data?.grouped) return
    const updates: Record<string, string> = {}
    for (const [key, def] of Object.entries(TOGGLE_KEYS)) {
      for (const items of Object.values(data.grouped)) {
        if (!Array.isArray(items)) continue
        const cred = items.find(c => c.key === key)
        if (cred && !cred.isSet && !cred.value && !editing[key]) {
          updates[key] = def.options[0].value
        }
      }
    }
    if (Object.keys(updates).length) setEditing(e => ({ ...e, ...updates }))
  }, [data])

  const save = async (key: string) => {
    if (!editing[key]) return
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await adminFetch(`${API}/admin/credentials/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editing[key] }),
      })
      setSaved(s => ({ ...s, [key]: true }))
      setEditing(e => { const n = { ...e }; delete n[key]; return n })
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2500)
      load()
    } catch {
      /* ignore */
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  const saveToggle = async (key: string, value: string) => {
    setEditing(ed => ({ ...ed, [key]: value }))
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await adminFetch(`${API}/admin/credentials/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      setSaved(s => ({ ...s, [key]: true }))
      setTimeout(() => setSaved(s => ({ ...s, [key]: false })), 2000)
      load()
    } catch {
      /* ignore */
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 14 }}>
        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
        Carregando credenciais…
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error || !data || !data.grouped) {
    return (
      <div style={{ padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)', marginBottom: 12 }}>
          <AlertCircle size={20} />
          <span style={{ fontSize: 15, fontWeight: 700 }}>Erro ao carregar credenciais</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 16 }}>
          {error ?? 'Não foi possível carregar as credenciais. Verifique se o servidor backend (gaspago-api) está rodando na porta 3030.'}
        </p>
        <button
          onClick={load}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, background: 'var(--flame)',
            color: '#fff', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}
        >
          <RefreshCw size={13} /> Tentar novamente
        </button>
      </div>
    )
  }

  const groups = Object.entries(data.grouped)

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .cred-input:focus {
          outline: none;
          border-color: var(--flame) !important;
          box-shadow: 0 0 0 3px var(--flame-dim);
        }
        .save-btn:hover:not(:disabled) { opacity: .88; }

        /* ── Credential row layout ── */
        .cred-row {
          display: grid;
          grid-template-columns: 190px 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
        }
        .cred-row + .cred-row { border-top: 1px solid var(--border-lt); }

        /* ── Toggle button group ── */
        .toggle-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .cred-row {
            grid-template-columns: 1fr;
            gap: 10px;
            padding: 14px 16px;
          }
          .cred-group-header {
            padding: 12px 16px !important;
          }
          .cred-action {
            display: flex;
            justify-content: flex-end;
          }
          .toggle-group {
            flex-direction: column;
          }
          .toggle-btn {
            width: 100%;
            justify-content: center;
          }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .cred-row {
            grid-template-columns: 160px 1fr auto;
            gap: 10px;
            padding: 12px 16px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          Configuração
        </p>
        <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em' }}>
          Credenciais
        </h1>
        <p style={{ color: 'var(--sub)', marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
          Valores encriptados com AES-256-GCM. Apenas a{' '}
          <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>MASTER_KEY</code>
          {' '}fica no{' '}
          <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>.env</code>.
        </p>
      </div>

      {/* Status summary */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10, marginBottom: 24,
        background: data.allSet ? 'var(--green-dim)' : 'var(--amber-dim)',
        border: `1px solid ${data.allSet ? 'rgba(34,197,94,.25)' : 'rgba(245,158,11,.25)'}`,
      }}>
        {data.allSet
          ? <Check size={15} color="var(--green)" style={{ flexShrink: 0 }} />
          : <AlertCircle size={15} color="var(--amber)" style={{ flexShrink: 0 }} />
        }
        <span style={{ fontSize: 13, fontWeight: 500, color: data.allSet ? '#166534' : '#92400E', wordBreak: 'break-word' }}>
          {data.allSet
            ? 'Todas as integrações configuradas'
            : `${(data.missing ?? []).length} chave(s) ausente(s): ${(data.missing ?? []).slice(0, 4).join(', ')}${(data.missing ?? []).length > 4 ? ` +${(data.missing ?? []).length - 4}` : ''}`
          }
        </span>
      </div>

      {/* Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map(([group, items]) => {
          const meta = GROUP_META[group] ?? { label: group, desc: '', color: '#475569' }
          const groupSet = items.filter(c => !c.readonly).every(c => c.isSet)
          return (
            <div key={group} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)',
            }}>
              {/* Group header */}
              <div className="cred-group-header" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
                gap: 10, flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 8, height: 28, borderRadius: 4, flexShrink: 0,
                    background: meta.color,
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{meta.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta.desc}</div>
                  </div>
                </div>
                {items.every(c => c.readonly) ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: 'rgba(100,116,139,.08)', color: 'var(--sub)',
                    border: '1px solid rgba(100,116,139,.2)', whiteSpace: 'nowrap',
                  }}>
                    <Lock size={9} /> Stack interna
                  </span>
                ) : (
                  <Badge isSet={groupSet} />
                )}
              </div>

              {/* Rows */}
              {items.map(cred => {
                const isVisible = visible[cred.key]
                const inputType = cred.sensitive && !isVisible ? 'password' : 'text'
                // isEditing: true when the key exists in editing state (even if empty string)
                const isEditing = Object.prototype.hasOwnProperty.call(editing, cred.key)
                const isDirty = !!editing[cred.key]   // has actual content to save
                const toggleDef = TOGGLE_KEYS[cred.key]

                return (
                  <div key={cred.key} className="cred-row">

                    {/* Label */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{cred.label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '.02em' }}>{cred.key}</div>
                      {cred.hint && <div style={{ fontSize: 11, color: 'var(--placeholder)', marginTop: 3, lineHeight: 1.4 }}>{cred.hint}</div>}
                    </div>

                    {/* Input / Toggle / Readonly */}
                    {toggleDef ? (
                      <div className="toggle-group">
                        {toggleDef.options.map(opt => {
                          const current = editing[cred.key] ?? cred.value ?? 'sandbox'
                          const active = current === opt.value
                          const OptionIcon = opt.Icon
                          return (
                            <button key={opt.value} className="toggle-btn" onClick={() => saveToggle(cred.key, opt.value)} style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                              border: `1px solid ${active ? opt.color : 'var(--border)'}`,
                              background: active ? `${opt.color}14` : 'var(--surface)',
                              color: active ? opt.color : 'var(--muted)',
                              fontSize: 13, fontWeight: active ? 600 : 400,
                              transition: 'all .15s',
                            }}>
                              <OptionIcon size={13} />
                              <span>{opt.label}</span>
                              <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", opacity: .65 }}>{opt.desc}</span>
                              {active && <Check size={11} style={{ marginLeft: 2 }} />}
                            </button>
                          )
                        })}
                      </div>
                    ) : cred.readonly ? (
                      <div style={{
                        padding: '8px 12px', borderRadius: 8, fontSize: 12,
                        fontFamily: "'JetBrains Mono',monospace",
                        background: 'var(--surface-2)', border: '1px solid var(--border-lt)',
                        color: 'var(--sub)', display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <Lock size={11} color="var(--muted)" style={{ flexShrink: 0 }} />
                        {cred.sensitive ? '••••••••' : (cred.value ?? 'auto-configurado')}
                      </div>
                    ) : cred.isSet && !isEditing ? (
                      /* ── Configured display (view mode) ── */
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,.2)',
                      }}>
                        <Check size={13} color="var(--green)" style={{ flexShrink: 0 }} />
                        <span style={{
                          flex: 1, fontFamily: cred.sensitive ? "'JetBrains Mono',monospace" : 'inherit',
                          fontSize: 13, color: 'var(--sub)',
                        }}>
                          {cred.sensitive ? '••••••••' : (cred.value ?? '••••••••')}
                        </span>
                        <button
                          onClick={() => setEditing(ed => ({ ...ed, [cred.key]: '' }))}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: 'none', border: '1px solid rgba(34,197,94,.3)',
                            borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                            fontSize: 11, fontWeight: 600, color: '#166534',
                          }}
                        >
                          <Pencil size={10} /> Editar
                        </button>
                      </div>
                    ) : (
                      /* ── Edit mode (input) ── */
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            className="cred-input"
                            autoFocus={cred.isSet}
                            type={inputType}
                            placeholder={cred.isSet ? 'Digite o novo valor…' : 'Não configurado'}
                            value={editing[cred.key] ?? ''}
                            onChange={e => setEditing(ed => ({ ...ed, [cred.key]: e.target.value }))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') save(cred.key)
                              if (e.key === 'Escape' && cred.isSet) setEditing(ed => { const n = { ...ed }; delete n[cred.key]; return n })
                            }}
                            style={{
                              width: '100%', padding: '9px 36px 9px 12px', boxSizing: 'border-box',
                              border: `1px solid ${isDirty ? 'var(--flame)' : 'var(--border)'}`,
                              borderRadius: 8, fontSize: 13,
                              fontFamily: cred.sensitive ? "'JetBrains Mono',monospace" : 'inherit',
                              background: isDirty ? 'rgba(255,101,36,.02)' : 'var(--surface)',
                              color: 'var(--text)', transition: 'border .15s',
                            }}
                          />
                          {cred.sensitive && (
                            <button
                              onClick={() => setVisible(v => ({ ...v, [cred.key]: !v[cred.key] }))}
                              style={{
                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', padding: 2, color: 'var(--muted)', cursor: 'pointer',
                              }}
                            >
                              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          )}
                        </div>
                        {cred.isSet && (
                          <button
                            title="Cancelar"
                            onClick={() => setEditing(ed => { const n = { ...ed }; delete n[cred.key]; return n })}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 36, borderRadius: 8, border: '1px solid var(--border)',
                              background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action column */}
                    <div className="cred-action">
                      {cred.readonly || toggleDef ? (
                        saved[cred.key] ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600, color: 'var(--green)',
                            padding: '6px 12px', borderRadius: 7, whiteSpace: 'nowrap',
                            border: '1px solid rgba(34,197,94,.25)', background: 'var(--green-dim)',
                          }}>
                            <Check size={10} /> Salvo
                          </span>
                        ) : cred.readonly ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                            padding: '6px 12px', borderRadius: 7, whiteSpace: 'nowrap',
                            border: '1px solid var(--border-lt)', background: 'var(--surface-2)',
                          }}>
                            <Lock size={10} /> Stack
                          </span>
                        ) : null
                      ) : !isEditing && cred.isSet ? (
                        /* view mode — no action needed */
                        null
                      ) : (
                        <button
                          className="save-btn"
                          onClick={() => save(cred.key)}
                          disabled={!isDirty || saving[cred.key]}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8,
                            border: `1px solid ${isDirty || saved[cred.key] ? 'transparent' : 'var(--border)'}`,
                            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                            transition: 'all .15s', minWidth: 90,
                            background: saved[cred.key] ? 'var(--green)' : isDirty ? 'var(--flame)' : 'var(--surface-2)',
                            color: (saved[cred.key] || isDirty) ? '#fff' : 'var(--muted)',
                            cursor: isDirty ? 'pointer' : 'default',
                          }}
                        >
                          {saved[cred.key]
                            ? <><Check size={13} /> Salvo</>
                            : saving[cred.key]
                              ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              : <><Save size={13} /> Salvar</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
