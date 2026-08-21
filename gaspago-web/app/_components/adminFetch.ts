// Fetch wrapper for the SuperAdmin panel. Attaches the Bearer token and, on a 401
// (missing/expired/invalid session), clears it and sends the browser to /login —
// instead of leaving every page to show its own dead-end "session expired" card.
export function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gp_admin_token') : null
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(input, { ...init, headers }).then(res => {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('gp_admin_token')
      window.location.href = '/login'
    }
    return res
  })
}

export function adminLogout() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('gp_admin_token')
  window.location.href = '/login'
}
