'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Credenciador',
  description: 'Acesse o portal do credenciador Gás Pago.',
  robots: { index: false, follow: false },
}


import PortalLoginForm from '../../_components/PortalLoginForm'

export default function CredenciadorLoginPage() {
  return <PortalLoginForm portal="credenciador" />
}
