import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://6138f2e794a0ba9846c0f50da47cc8bd@o4507760719233024.ingest.de.sentry.io/4510540278071376',

  tracesSampleRate: 1.0,

  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      blockAllMedia: false,
    }),
  ],

  beforeSend(event, hint) {
    if (event.exception) {
      console.error('yo this broke:', hint.originalException || hint.syntheticException)
    }
    return event
  },
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
