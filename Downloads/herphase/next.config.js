// next.config.js
// withSentryConfig is bypassed — SENTRY_AUTH_TOKEN expired on Vercel.
// Sentry SDK still runs at runtime via sentry.client.config.ts.
// Re-enable by wrapping nextConfig with withSentryConfig once token is renewed.

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
