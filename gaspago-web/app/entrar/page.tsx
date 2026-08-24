'use client'

import PortalLoginForm from '../_components/PortalLoginForm'

// Single login for all 3 B2B portals (distribuidora, credenciador, estabelecimento) —
// the account's role decides where it lands, not the URL the user happened to pick.
export default function EntrarPage() {
  return <PortalLoginForm />
}
