"use client";

// components/PageSkeleton.tsx — skeleton loading state for all pages

export default function PageSkeleton() {
  return (
    <div className="min-h-dvh bg-background px-4 pt-6 mx-auto max-w-app animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded-full bg-dark/8" />
          <div className="h-6 w-36 rounded-full bg-dark/10" />
        </div>
        <div className="w-10 h-10 rounded-full bg-dark/8" />
      </div>
      {/* Dark card placeholder */}
      <div className="h-28 rounded-2xl mb-3" style={{ background: "rgba(42,35,48,0.12)" }} />
      {/* Card 1 */}
      <div className="bg-white rounded-2xl p-4 mb-3 space-y-3">
        <div className="h-3 w-24 rounded-full bg-dark/8" />
        <div className="h-5 w-40 rounded-full bg-dark/10" />
        <div className="flex gap-3">
          <div className="flex-1 h-2 rounded-full bg-dark/8" />
          <div className="flex-1 h-2 rounded-full bg-dark/8" />
          <div className="flex-1 h-2 rounded-full bg-dark/8" />
        </div>
      </div>
      {/* Card 2 */}
      <div className="bg-white rounded-2xl p-4 mb-3 space-y-3">
        <div className="h-3 w-20 rounded-full bg-dark/8" />
        <div className="h-4 w-full rounded-full bg-dark/8" />
        <div className="h-4 w-3/4 rounded-full bg-dark/8" />
      </div>
      {/* Card 3 */}
      <div className="bg-white rounded-2xl p-4 mb-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="h-14 rounded-xl bg-dark/8" />
          <div className="h-14 rounded-xl bg-dark/8" />
          <div className="h-14 rounded-xl bg-dark/8" />
        </div>
      </div>
    </div>
  );
}
