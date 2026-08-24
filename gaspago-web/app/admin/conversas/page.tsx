'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { adminFetch } from '../../_components/adminFetch'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

interface Conversation {
  phone: string
  lastMessage: string
  lastDirection: 'INBOUND' | 'OUTBOUND'
  lastAt: string
  messageCount: number
}

interface Message {
  id: string
  phone: string
  direction: 'INBOUND' | 'OUTBOUND'
  text: string
  createdAt: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AdminConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [threadLoading, setThreadLoading] = useState(false)

  useEffect(() => {
    adminFetch(`${API}/admin/conversations`)
      .then(r => r.json())
      .then(d => setConversations(d.conversations ?? []))
      .catch(() => setError('Erro ao carregar conversas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setThreadLoading(true)
    adminFetch(`${API}/admin/conversations/${selected}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .finally(() => setThreadLoading(false))
  }, [selected])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ground)', padding: '32px 24px', fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Atendimento
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Conversas do WhatsApp
          </h1>
          <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--sub)' }}>
            Histórico real de todas as mensagens trocadas pelo bot do Conexbot.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, height: 560 }}>
          <div style={{ width: 320, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /></div>
              ) : error ? (
                <div style={{ padding: 16, fontSize: 12.5, color: 'var(--red)' }}>{error}</div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  <MessageCircle size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                  <div style={{ fontSize: 13 }}>Nenhuma conversa ainda</div>
                </div>
              ) : (
                conversations.map(c => (
                  <button
                    key={c.phone}
                    onClick={() => setSelected(c.phone)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                      border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: selected === c.phone ? 'var(--ground)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{c.phone}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{formatTime(c.lastAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.lastDirection === 'OUTBOUND' ? '→ ' : ''}{c.lastMessage}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{c.messageCount} mensagem{c.messageCount !== 1 ? 's' : ''}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!selected ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Selecione uma conversa
              </div>
            ) : (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>{selected}</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {threadLoading ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    messages.map(m => (
                      <div key={m.id} style={{ alignSelf: m.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                        <div style={{
                          padding: '9px 13px', borderRadius: 12, fontSize: 13, whiteSpace: 'pre-wrap',
                          background: m.direction === 'OUTBOUND' ? 'var(--flame)' : 'var(--ground)',
                          color: m.direction === 'OUTBOUND' ? '#fff' : 'var(--text)',
                        }}>
                          {m.text}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, textAlign: m.direction === 'OUTBOUND' ? 'right' : 'left' }}>
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
