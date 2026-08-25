import type { Metadata } from 'next'
import PainelLayout from './_ClientLayout'

export const metadata: Metadata = {
  title: { template: '%s · Meu Painel', default: 'Meu Painel · Gás Pago' },
  description: 'Painel do afiliado Gás Pago.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PainelLayout>{children}</PainelLayout>
}
