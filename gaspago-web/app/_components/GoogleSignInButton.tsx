'use client'

import { useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

declare global {
  interface Window {
    google?: any
  }
}

type Portal = 'distributor' | 'credenciador' | 'pos' | 'admin'

export default function GoogleSignInButton({
  portal,
  onSuccess,
  onError,
}: {
  portal: Portal
  onSuccess: (data: { token: string; role: string }) => void
  onError: (message: string) => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch(`${API}/auth/google-client-id`)
      .then(r => r.json())
      .then(d => setClientId(d.clientId))
      .catch(() => setClientId(null))
  }, [])

  useEffect(() => {
    if (!clientId) return

    async function handleCredential(response: { credential: string }) {
      try {
        const res = await fetch(`${API}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: response.credential, portal }),
        })
        const data = await res.json()
        if (!res.ok) {
          onError(data.error ?? 'Falha ao entrar com Google')
          return
        }
        onSuccess(data)
      } catch {
        onError('Erro ao conectar com o servidor')
      }
    }

    function init() {
      if (!window.google || !divRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      })
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        width: 340,
        text: 'continue_with',
        locale: 'pt-BR',
      })
      setReady(true)
    }

    if (window.google) {
      init()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = init
    document.head.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [clientId, portal])

  if (!clientId) return null

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', opacity: ready ? 1 : 0, transition: 'opacity .2s', minHeight: ready ? 'auto' : 0 }}>
      <div ref={divRef} />
    </div>
  )
}
