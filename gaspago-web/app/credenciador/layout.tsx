import type { Metadata } from 'next'
import CredenciadorLayout from './_ClientLayout'

export const metadata: Metadata = {
  title: { template: '%s · Credenciador', default: 'Portal Credenciador · Gás Pago' },
  description: 'Portal do credenciador no Gás Pago.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CredenciadorLayout>{children}</CredenciadorLayout>
}
