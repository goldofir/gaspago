import type { Metadata } from 'next'
import DistributorLayout from './_ClientLayout'

export const metadata: Metadata = {
  title: { template: '%s · Distribuidora', default: 'Portal Distribuidora · Gás Pago' },
  description: 'Portal da distribuidora parceira no Gás Pago.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DistributorLayout>{children}</DistributorLayout>
}
