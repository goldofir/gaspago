import type { Metadata } from 'next'
import LandingPage from './_LandingPage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gaspago.app'

export const metadata: Metadata = {
  title: 'Gás Pago - Ecossistema de Compensação Financeira & Economia Recorrente',
  description: 'Transforme seu consumo diário em economia real. Ganhe comissões acumulativas com o token FGOL e potencialize seus rendimentos com nossa rede de afiliados e parceiros.',
  keywords: ['ecossistema de compensação','economia recorrente','token FGOL','rede de afiliados','cashback inteligente','fidelidade no balcão','marketplace de recompensas','gás pago'],
  alternates: { canonical: SITE_URL, languages: { 'pt-BR': SITE_URL } },
  openGraph: {
    title: 'Gás Pago - Ecossistema de Compensação Financeira & Economia Recorrente',
    description: 'Transforme seu consumo em retorno financeiro. Potencialize seus ganhos com o token FGOL e nossa rede de afiliados.',
    url: SITE_URL,
    type: 'website',
    locale: 'pt_BR',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Gás Pago - Ecossistema de Compensação' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gás Pago - Ecossistema de Compensação Financeira & Economia Recorrente',
    description: 'Transforme seu consumo em retorno financeiro. Potencialize seus ganhos com o token FGOL e nossa rede de afiliados.',
    images: ['/og-image.png'],
  },
}

export default function HomePage() {
  return <LandingPage />
}
