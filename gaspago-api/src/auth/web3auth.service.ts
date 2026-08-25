import { createRemoteJWKSet, jwtVerify } from 'jose'
import { SystemConfigService } from '../shared/system-config.service'

const JWKS_URL = 'https://api-auth.web3auth.io/jwks'
const ISSUER = 'https://api-auth.web3auth.io'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))
  return jwks
}

export type Web3AuthProfile = {
  email: string | null
  name: string | null
  walletAddress: string
}

// Verifies a Web3Auth idToken against Web3Auth's own JWKS (never trust an
// idToken without this — anyone could otherwise POST a fabricated payload
// claiming any wallet/email) and cross-checks the wallet address the frontend
// claims to own against the wallets embedded in the token itself, per
// Web3Auth's documented verification pattern.
export async function verifyWeb3AuthToken(idToken: string, claimedWalletAddress: string): Promise<Web3AuthProfile> {
  const clientId = SystemConfigService.get('WEB3AUTH_CLIENT_ID')
  if (!clientId) {
    throw Object.assign(new Error('Web3Auth não configurado. Configure em SuperAdmin → Credenciais.'), { statusCode: 500 })
  }

  let payload: any
  try {
    const result = await jwtVerify(idToken, getJwks(), {
      algorithms: ['ES256'],
      issuer: ISSUER,
      audience: clientId,
    })
    payload = result.payload
  } catch (err: any) {
    // Was swallowed entirely before — always the same generic 401 no matter
    // WHY verification actually failed (wrong audience, expired, wrong
    // issuer, JWKS fetch failure...). Logging jose's real error (it's
    // typed — .code/.message are specific, e.g. JWTClaimValidationFailed
    // vs JWSSignatureVerificationFailed) is the only way to tell "the
    // clientId configured in Credenciais doesn't match the one the
    // frontend actually initialized with" apart from "token genuinely
    // expired" apart from "network/JWKS unreachable."
    console.error('[web3auth] token verification failed', { code: err?.code, message: err?.message, clientId })
    throw Object.assign(new Error('Token de autenticação inválido ou expirado.'), { statusCode: 401 })
  }

  const wallets: Array<{ address?: string; public_key?: string }> = payload.wallets ?? []
  const normalized = claimedWalletAddress.toLowerCase()
  const owned = wallets.some(w => w.address?.toLowerCase() === normalized)
  if (!owned) {
    throw Object.assign(new Error('A carteira informada não pertence a este login.'), { statusCode: 401 })
  }

  return {
    email: payload.email ?? null,
    name: payload.name ?? null,
    walletAddress: claimedWalletAddress,
  }
}
