'use client'

import { useSearchParams } from 'next/navigation'

export function ErrorBanner() {
  const params = useSearchParams()
  const error = params.get('error')
  const errorId = params.get('errorId')

  if (error !== 'shit_broke') return null

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-yellow-900/90 border border-yellow-600 text-yellow-200 px-4 py-3 rounded-lg font-mono text-sm backdrop-blur-sm z-50">
      welp.. if u see this, something really went oh oh... go annoy admins with this ID:{' '}
      {errorId || 'unknown'}
    </div>
  )
}
