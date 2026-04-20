import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <div
        className="fixed top-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)" }}
      />
      <div className="relative z-10 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center text-3xl shadow-soft"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          🌸
        </div>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: "#C48A97" }}
        >
          404
        </p>
        <h1 className="font-display text-2xl font-semibold text-dark mb-2">
          Page not found
        </h1>
        <p className="text-sm font-body mb-8" style={{ color: "var(--color-text-dim)" }}>
          This page doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-8 py-3.5 rounded-2xl font-semibold text-white text-sm shadow-soft transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          ← Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
