import type { Metadata } from 'next'
import LandingPage from './_LandingPage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gaspago.app'

export const metadata: Metadata = {
  title: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
  description: 'A plataforma de economia compartilhada que transforma seu consumo diário em retorno financeiro. Ganhe comissões acumulativas com o token FGOL e potencialize seus rendimentos com nossa rede de afiliados.',
  keywords: ['economia compartilhada','sistema de compensação','token FGOL','rede de afiliados','consumo inteligente','fidelidade no balcão','plataforma de recompensas','gás pago'],
  alternates: { canonical: SITE_URL, languages: { 'pt-BR': SITE_URL } },
  openGraph: {
    title: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
    description: 'Transforme seu consumo em retorno financeiro com nossa plataforma de economia compartilhada. Potencialize seus ganhos com o token FGOL e nossa rede de afiliados.',
    url: SITE_URL,
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Gás Pago - Economia Compartilhada' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
    description: 'Transforme seu consumo em retorno financeiro com nossa plataforma de economia compartilhada. Potencialize seus ganhos com o token FGOL e nossa rede de afiliados.',
    images: ['/og-image.png'],
  },
}

export default function HomePage() {
  return <LandingPage />
}
