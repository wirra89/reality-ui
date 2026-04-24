// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withSentryConfig(nextConfig, {
  org: "wirralabs",
  project: "herphase",

  silent: !process.env.CI,

  // Skip source map upload — avoids build failures when SENTRY_AUTH_TOKEN is missing/expired
  sourcemaps: {
    disable: true,
  },

  // Don't create Sentry releases during build
  disableLogger: true,

  widenClientFileUpload: false,
});
