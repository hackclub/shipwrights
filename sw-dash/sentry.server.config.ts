// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://6138f2e794a0ba9846c0f50da47cc8bd@o4507760719233024.ingest.de.sentry.io/4510540278071376',
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: true,
  })
}
