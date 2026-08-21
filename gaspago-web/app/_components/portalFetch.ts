// Thin fetch wrapper that attaches the portal's Bearer token from localStorage.
// tokenKey is one of 'gp_distributor_token' | 'gp_credenciador_token' | 'gp_pos_token'.
export function portalFetch(tokenKey: string, input: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
