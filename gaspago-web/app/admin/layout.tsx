import type { Metadata } from 'next'
import AdminLayout from './_ClientLayout'

export const metadata: Metadata = {
  title: { template: '%s · Admin', default: 'Admin · Gás Pago' },
  description: 'Painel administrativo do Gás Pago.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
