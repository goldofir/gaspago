'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Loader2, ArrowLeft } from 'lucide-react'
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
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .conversas-layout {
          display: flex;
          gap: 16px;
          height: 600px;
        }

        .conversas-list-col {
          width: 320px;
          flex-shrink: 0;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .conversas-chat-col {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .conversas-layout {
            flex-direction: column;
            height: auto;
          }
          .conversas-list-col {
            width: 100%;
            height: ${selected ? '0px' : '500px'};
            display: ${selected ? 'none' : 'flex'};
          }
          .conversas-chat-col {
            width: 100%;
            height: 520px;
            display: ${selected ? 'flex' : 'none'};
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--flame)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Atendimento
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
          Conversas do WhatsApp
        </h1>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>
          Histórico de mensagens trocadas pelo robô de atendimento Conexbot.
        </p>
      </div>

      <div className="conversas-layout">
        {/* Left Column: Conversations List */}
        <div className="conversas-list-col">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Lista de Contatos
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : error ? (
              <div style={{ padding: 16, fontSize: 12.5, color: '#EF4444' }}>{error}</div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                <MessageCircle size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div style={{ fontSize: 13 }}>Nenhuma conversa registrada</div>
              </div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.phone}
                  onClick={() => setSelected(c.phone)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                    border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: selected === c.phone ? 'rgba(255,101,36,.08)' : 'transparent',
                    transition: 'background .15s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: selected === c.phone ? 'var(--flame)' : 'var(--text)' }}>
                      {c.phone}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{formatTime(c.lastAt)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastDirection === 'OUTBOUND' ? '→ ' : ''}{c.lastMessage}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                    {c.messageCount} mensagem{c.messageCount !== 1 ? 's' : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Active Thread */}
        <div className="conversas-chat-col">
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Selecione uma conversa ao lado para visualizar a thread de mensagens.
            </div>
          ) : (
            <>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      background: 'var(--ground)', border: '1px solid var(--border)', borderRadius: 6,
                      padding: '4px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)'
                    }}
                  >
                    <ArrowLeft size={14} /> Voltar
                  </button>
                  <span style={{ color: 'var(--text)' }}>{selected}</span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {threadLoading ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--muted)' }} />
                  </div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} style={{ alignSelf: m.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{
                        padding: '9px 13px', borderRadius: 12, fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.4,
                        background: m.direction === 'OUTBOUND' ? 'var(--flame)' : 'var(--ground)',
                        color: m.direction === 'OUTBOUND' ? '#fff' : 'var(--text)',
                        border: m.direction === 'OUTBOUND' ? 'none' : '1px solid var(--border)'
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
  )
}
