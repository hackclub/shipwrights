import * as Sentry from '@sentry/nextjs'

export function reportError(error: Error | string, context?: Record<string, unknown>) {
  console.error('yo this broke:', error)
  Sentry.captureException(error, { extra: context })
}

export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email,
  })
}

export function addContext(data: Record<string, unknown>) {
  Sentry.setContext('custom', data)
}

export function clearContext() {
  Sentry.getIsolationScope().clear()
}
