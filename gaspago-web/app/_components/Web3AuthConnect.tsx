'use client'

import { useState, useRef } from 'react'
import { Wallet, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030'

export type Web3AuthResult = {
  idToken: string
  walletAddress: string
  email: string | null
  name: string | null
}

// The SDK throws in English, straight from its own internals ("Wallet popup
// has been closed by the user.") — meaningless to a Brazilian business owner
// filling out a signup form, and reads like a totally separate app broke,
// not like "you closed the window, try again." Maps the handful of cases
// that actually happen in practice to plain Portuguese; anything unrecognized
// falls back to one generic friendly line instead of leaking raw SDK text —
// the real error is still in console.error for us to debug from.
function friendlyWeb3AuthError(err: any): string {
  const raw = String(err?.message ?? err ?? '').toLowerCase()
  if (raw.includes('popup') && raw.includes('closed')) {
    return 'Você fechou a janela antes de terminar. Toque no botão abaixo de novo pra continuar de onde parou.'
  }
  if (raw.includes('user closed') || raw.includes('user cancelled') || raw.includes('user canceled')) {
    return 'Conexão cancelada. Toque no botão abaixo pra tentar de novo.'
  }
  if (raw.includes('timeout') || raw.includes('timed out')) {
    return 'A conexão demorou demais e expirou. Tente de novo.'
  }
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return 'Sem conexão no momento. Verifique sua internet e tente de novo.'
  }
  return 'Não foi possível conectar. Tente de novo — se continuar, tente com outro método (Google ou e-mail).'
}

// Thrown for our own, already-friendly-Portuguese config errors — kept
// distinct from the SDK's own (English) errors so the catch block below
// knows which messages to translate and which to just pass through.
class Web3AuthConfigError extends Error {}

// One Web3Auth instance per page load — init() is expensive (loads the modal
// iframe) and calling it twice throws, same reasoning as the GSI singleton
// issue investigated elsewhere in this app.
let web3AuthPromise: Promise<any> | null = null

async function getWeb3Auth() {
  if (web3AuthPromise) return web3AuthPromise
  web3AuthPromise = (async () => {
    // @web3auth/modal's real types are shimmed to `any` in web3auth-shim.d.ts —
    // see that file for why (a TS type-instantiation crash in viem/ox, unrelated
    // to anything this component actually uses).
    const [{ Web3Auth, WALLET_CONNECTORS, WEB3AUTH_NETWORK }, cfg] = await Promise.all([
      import('@web3auth/modal'),
      fetch(`${API}/public-config`).then(r => r.json()),
    ])
    if (!cfg.web3authClientId) {
      throw new Web3AuthConfigError('Web3Auth não configurado. Peça pro administrador configurar em SuperAdmin → Credenciais.')
    }
    const network = (WEB3AUTH_NETWORK as any)[cfg.web3authNetwork?.toUpperCase()] ?? WEB3AUTH_NETWORK.SAPPHIRE_DEVNET
    const web3auth = new Web3Auth({
      clientId: cfg.web3authClientId,
      web3AuthNetwork: network,
      modalConfig: {
        connectors: {
          [WALLET_CONNECTORS.AUTH]: {
            label: 'auth',
            showOnModal: true,
            loginMethods: {
              google: { name: 'Google', showOnModal: true },
              email_passwordless: { name: 'E-mail', showOnModal: true },
              // Everything else Web3Auth supports by default (Facebook, Twitter…)
              // is off — this app only offers the two methods the product asked for.
              facebook: { name: 'Facebook', showOnModal: false },
              twitter: { name: 'Twitter', showOnModal: false },
              discord: { name: 'Discord', showOnModal: false },
              apple: { name: 'Apple', showOnModal: false },
              github: { name: 'Github', showOnModal: false },
            },
          },
        },
      },
    })
    await web3auth.init()
    return web3auth
  })()
  return web3AuthPromise
}

export default function Web3AuthConnect({
  label = 'Continuar com Google ou e-mail',
  onSuccess,
  onError,
  beforeConnect,
}: {
  label?: string
  onSuccess: (result: Web3AuthResult) => void
  onError: (message: string) => void
  // Runs synchronously right before opening the Web3Auth modal — e.g. to
  // validate the rest of a signup form first. Returning false aborts silently
  // (the caller is expected to have already surfaced its own error).
  beforeConnect?: () => boolean
}) {
  const [loading, setLoading] = useState(false)
  const busy = useRef(false)

  async function handleClick() {
    if (busy.current) return
    if (beforeConnect && !beforeConnect()) return
    busy.current = true
    setLoading(true)
    try {
      const web3auth = await getWeb3Auth()
      const connection = await web3auth.connect()
      const provider = connection?.ethereumProvider
      if (!provider) {
        onError('Não foi possível conectar. Tente novamente.')
        return
      }
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
      const walletAddress = accounts?.[0]
      const userInfo = await web3auth.getUserInfo()
      const idToken = userInfo?.idToken
      if (!walletAddress || !idToken) {
        onError('Login não retornou os dados esperados. Tente novamente.')
        return
      }
      onSuccess({ idToken, walletAddress, email: userInfo?.email ?? null, name: userInfo?.name ?? null })
    } catch (err: any) {
      // The SDK's connect() throws in English straight from its internals
      // (e.g. "Wallet popup has been closed by the user.") — meaningless to
      // an end user and reads like a different app broke. Always show a
      // friendly Portuguese line; the real error still goes to console for
      // us to debug from. Our own config errors are already friendly
      // Portuguese, so those pass through unchanged instead of being
      // (wrongly) matched against the SDK-error patterns.
      console.error('[Web3Auth] connect() failed:', err)
      onError(err instanceof Web3AuthConfigError ? err.message : friendlyWeb3AuthError(err))
    } finally {
      setLoading(false)
      busy.current = false
    }
  }

  return (
    <>
      <style>{`.w3a-spin { animation: w3a-spin .75s linear infinite; } @keyframes w3a-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff',
          color: '#0F2040', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13.5,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? <Loader2 size={16} className="w3a-spin" /> : <Wallet size={16} />}
        {loading ? 'Conectando…' : label}
      </button>
    </>
  )
}
