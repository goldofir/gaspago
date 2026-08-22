import type { Metadata } from 'next'
import LandingPage from './_LandingPage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gaspago.app'

export const metadata: Metadata = {
  title: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
  description: 'Quanto você ganha para consumir hoje? Você já pensou se pudesse ganhar 1 real de cada brasileiro todo mês? Conheça a plataforma de economia compartilhada do Gás Pago com token FGOL e rede de afiliados.',
  keywords: ['economia compartilhada','quanto você ganha para consumir hoje','ganhar 1 real de cada brasileiro','sistema de compensação','token FGOL','rede de afiliados','consumo inteligente','gás pago'],
  alternates: { canonical: SITE_URL, languages: { 'pt-BR': SITE_URL } },
  openGraph: {
    title: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
    description: 'Quanto você ganha para consumir hoje? E se pudesse ganhar R$ 1 de cada brasileiro todo mês? Transforme seu consumo em retorno financeiro.',
    url: SITE_URL,
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Gás Pago - Economia Compartilhada' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
    description: 'Quanto você ganha para consumir hoje? E se pudesse ganhar R$ 1 de cada brasileiro todo mês? Transforme seu consumo em retorno financeiro.',
    images: ['/og-image.png'],
  },
}

export default function HomePage() {
  return <LandingPage />
}
