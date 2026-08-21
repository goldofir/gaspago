const LOGIN_PATH: Record<string, string> = {
  gp_distributor_token: '/distributor/login',
  gp_credenciador_token: '/credenciador/login',
  gp_pos_token: '/pos/login',
}

// Thin fetch wrapper that attaches the portal's Bearer token from localStorage.
// tokenKey is one of 'gp_distributor_token' | 'gp_credenciador_token' | 'gp_pos_token'.
// On a 401 (missing/expired/wrong-role session), clears the token and sends the
// browser back to that portal's own login instead of leaving the page stuck.
export function portalFetch(tokenKey: string, input: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(input, { ...init, headers }).then(res => {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(tokenKey)
      window.location.href = LOGIN_PATH[tokenKey] ?? '/login'
    }
    return res
  })
}
