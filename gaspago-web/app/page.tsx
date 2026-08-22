import type { Metadata } from 'next'
import LandingPage from './_LandingPage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gaspago.com.br'

export const metadata: Metadata = {
  title: 'Gas Pago — Gas GLP entregue com cashback',
  description: 'Peca gas de cozinha pelo app ou WhatsApp. Receba na porta, pague com PIX ou FGOL e ganhe cashback em cada pedido. Distribuidoras verificadas perto de voce.',
  keywords: [
    'gas de cozinha', 'botijao de gas', 'GLP', 'entrega de gas', 'pedir gas online',
    'gas rapido', 'cashback gas', 'FGOL', 'gas pago', 'distribuidora de gas',
    'gas por aplicativo', 'gas whatsapp'
  ],
  alternates: {
    canonical: SITE_URL,
    languages: { 'pt-BR': SITE_URL },
  },
  openGraph: {
    title: 'Gas Pago — Gas GLP entregue com cashback',
    description: 'Peca gas de cozinha pelo app ou WhatsApp. Receba na porta, pague com PIX ou FGOL e ganhe cashback em cada pedido.',
    url: SITE_URL,
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Gas Pago — Peca gas e ganhe cashback',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gas Pago — Gas GLP entregue com cashback',
    description: 'Peca gas de cozinha pelo app ou WhatsApp e ganhe cashback em FGOL a cada pedido.',
    images: ['/og-image.png'],
  },
}

export default function HomePage() {
  return <LandingPage />
}
