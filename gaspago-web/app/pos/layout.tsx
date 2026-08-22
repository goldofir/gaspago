import type { Metadata } from 'next'
import PosLayout from './_ClientLayout'

export const metadata: Metadata = {
  title: { template: '%s · POS', default: 'Ponto de Venda · Gás Pago' },
  description: 'Terminal de ponto de venda do Gás Pago.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PosLayout>{children}</PosLayout>
}
