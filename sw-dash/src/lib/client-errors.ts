'use client'

import * as Sentry from '@sentry/nextjs'

export function report(err: Error | string, context?: Record<string, unknown>) {
  console.error('shit broke:', err)
  Sentry.captureException(err, { extra: context })
}

export function showError(msg: string, err?: Error | string) {
  if (err) {
    report(typeof err === 'string' ? new Error(err) : err, { userMessage: msg })
  }

  const existing = document.getElementById('err-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'err-toast'
  toast.className =
    'fixed bottom-4 right-4 bg-red-900/90 border border-red-700 text-red-200 px-4 py-3 rounded-lg font-mono text-sm z-50 max-w-sm'
  toast.textContent = msg

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}
