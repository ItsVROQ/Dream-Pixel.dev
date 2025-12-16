import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Dream Pixel',
  description: 'Generate dreamlike pixel art with AI.',
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  authors: [{ name: 'Dream Pixel Team' }],
  openGraph: {
    title: 'Dream Pixel',
    description: 'Generate dreamlike pixel art with AI.',
    type: 'website',
  },
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Sentry monitoring tunnel endpoint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.protocol === 'https:') {
                window.__sentryTunnel = '${process.env.NEXT_PUBLIC_SENTRY_DSN ? '/monitoring' : ''}';
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
