// instrumentation.ts
// Next.js loads this file on the server before any routes are handled.
// Required for server-side Sentry to work with App Router.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
