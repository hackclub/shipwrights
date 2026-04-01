import * as Sentry from '@sentry/nextjs'

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')

    if (process.env.POSTGRES_URL) {
      const { runPgSync } = await import('@/lib/pg-sync')

      const run = () =>
        runPgSync()
          .then((r) => console.log('[pg-sync] done', r))
          .catch((e) => console.error('[pg-sync] failed', e))

      run()
      setInterval(run, TWENTY_FOUR_HOURS)
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
