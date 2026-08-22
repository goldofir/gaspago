import type { Metadata, Viewport } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gaspago.app'

const SITE_NAME = 'Gás Pago'
const DEFAULT_DESCRIPTION =
  'Plataforma de economia compartilhada e sistema de compensação. Transforme seu consumo e compras em retornos financeiros com o token FGOL e nossa rede de afiliados.'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FF6524',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | Gás Pago',
    default: 'Gás Pago - Plataforma de Economia Compartilhada & Sistema de Compensação',
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'economia compartilhada',
    'sistema de compensação',
    'token FGOL',
    'rede de afiliados',
    'consumo inteligente',
    'fidelidade no balcão',
    'plataforma de recompensas',
    'gás pago',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: SITE_URL,
    languages: { 'pt-BR': SITE_URL },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Gás GLP entregue com cashback`,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Gás Pago — Peça gás e ganhe cashback',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@gaspago',
    creator: '@gaspago',
    title: `${SITE_NAME} — Gás GLP entregue com cashback`,
    description: DEFAULT_DESCRIPTION,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32.png',
  },
  manifest: '/manifest.json',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? '',
  },
  category: 'technology',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Portuguese',
  },
}

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'iOS, Android',
  description: DEFAULT_DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
  },
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            /* Brand */
            --flame:      #FF6524;
            --flame-lt:   #FF8B56;
            --flame-dim:  rgba(255,101,36,.10);
            --gold:       #F2B825;
            --navy:       #0A1628;
            --navy-mid:   #112040;
            --navy-hover: rgba(255,255,255,.06);

            /* Surface */
            --ground:     #F4F6FA;
            --surface:    #FFFFFF;
            --surface-2:  #F8FAFC;
            --border:     #E2E8F0;
            --border-lt:  #EEF2F7;

            /* Text */
            --text:       #0F2040;
            --sub:        #475569;
            --muted:      #94A3B8;
            --placeholder:#B0BAC8;

            /* Semantic */
            --green:      #22C55E;
            --green-dim:  rgba(34,197,94,.10);
            --red:        #EF4444;
            --red-dim:    rgba(239,68,68,.10);
            --amber:      #F59E0B;
            --amber-dim:  rgba(245,158,11,.10);

            /* Shadows */
            --shadow-sm:  0 1px 2px rgba(15,32,64,.05);
            --shadow:     0 1px 4px rgba(15,32,64,.06), 0 4px 20px rgba(15,32,64,.05);
            --shadow-md:  0 2px 8px rgba(15,32,64,.08), 0 8px 32px rgba(15,32,64,.06);
          }

          html { font-size: 15px; }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--ground);
            color: var(--text);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          a { color: var(--flame); text-decoration: none; }
          a:hover { text-decoration: underline; }
          button { font-family: inherit; cursor: pointer; }
          input, textarea, select { font-family: inherit; }

          /* Scrollbar */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: var(--muted); }
        `}</style>
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        {children}
      </body>
    </html>
  )
}

