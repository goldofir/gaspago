import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Acesse sua conta no Gas Pago.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
