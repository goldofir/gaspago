'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Distribuidora',
  description: 'Acesse o portal da distribuidora Gás Pago.',
  robots: { index: false, follow: false },
}


import PortalLoginForm from '../../_components/PortalLoginForm'

export default function DistributorLoginPage() {
  return <PortalLoginForm portal="distributor" />
}
