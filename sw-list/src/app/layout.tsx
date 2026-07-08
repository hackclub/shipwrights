import type { Metadata } from 'next'
import './globals.css'
import { Cookie } from '@/components/cookie'

export const metadata: Metadata = {
  title: 'Official Shipwrights Crew',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ overflow: 'hidden' }}>
        {children}
        <Cookie />
      </body>
    </html>
  )
}
