"use client";

// app/global-error.tsx
// Next.js App Router error boundary — catches unhandled React render errors.
// Sentry captures the exception before showing the fallback UI.
// This is the last line of defense — ideally testera never sees this.

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100dvh",
            background: "#F7F5F2",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌸</div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#2E2E2E",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#9CA3AF",
              marginBottom: 24,
              textAlign: "center",
              maxWidth: 280,
            }}
          >
            We've been notified and will fix it. Please reload the app.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload HerPhase
          </button>
        </div>
      </body>
    </html>
  );
}
