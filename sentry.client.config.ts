// sentry.client.config.ts
// Captures errors that occur in the browser (client components, user interactions).
// This file is loaded automatically by Next.js via instrumentation-client.ts.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Minimal performance tracing for V1 — captures 10% of sessions.
  // Increase to 1.0 if you want full traces; decrease to 0 to disable.
  tracesSampleRate: 0.1,

  // Capture full session replay only when an error occurs.
  // This lets you see exactly what the tester was doing before the crash.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05, // 5% of normal sessions

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,    // HerPhase has no PII in text fields that matters here
      blockAllMedia: false,
    }),
  ],

  // Don't send errors in development — only in production
  enabled: process.env.NODE_ENV === "production",
});
