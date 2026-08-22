'use client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login POS',
  description: 'Acesse o terminal de ponto de venda do Gás Pago.',
  robots: { index: false, follow: false },
}


import PortalLoginForm from '../../_components/PortalLoginForm'

export default function PosLoginPage() {
  return <PortalLoginForm portal="pos" />
}
