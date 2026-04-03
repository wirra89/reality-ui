// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withSentryConfig(nextConfig, {
  org: "wirralabs",
  project: "herphase",

  // Only print Sentry logs in CI
  silent: !process.env.CI,

  // Upload larger source maps for better stack traces
  widenClientFileUpload: true,

  // Tree-shake Sentry logger statements to reduce bundle size
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
