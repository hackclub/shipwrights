'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    const eventId = Sentry.captureException(error)
    const errorId = eventId || error.digest || Date.now().toString(36)
    router.push(`/admin?error=shit_broke&errorId=${errorId}`)
  }, [error, router])

  return null
}
