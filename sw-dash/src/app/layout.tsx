import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Snow } from '@/components/snow'
import './globals.css'

const sans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const mono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'sw-dash',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'sw-dash',
  },
}

export const viewport: Viewport = {
  themeColor: '#78350f',
  width: 'device-width',
  initialScale: 1,
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo_192_192.png" />
        <link rel="preload" href="/logo_nobg_notext.png" as="image" />
      </head>
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <Snow />
        {children}
      </body>
    </html>
  )
}
