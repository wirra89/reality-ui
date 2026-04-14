"use client";

// components/ReadinessCard.tsx
// Refactored in Step 3 — now accepts pre-computed score + label from TodayState.
// No longer contains inline readiness calculation (moved to lib/dailyPlan.ts).

import type { ReadinessLabel } from "@/lib/dailyPlan";

interface Props {
  score: number;          // 0–100, computed by dailyPlan engine
  label: ReadinessLabel;  // "rest" | "moderate" | "good" | "peak"
  adaptedFromCheckin?: boolean; // true = based on today's check-in
}

const LABEL_COLORS: Record<ReadinessLabel, string> = {
  rest:     "#F87171",
  moderate: "#A78BFA",
  good:     "#34D399",
  peak:     "#FBBF24",
};

const LABEL_DISPLAY: Record<ReadinessLabel, string> = {
  rest:     "Rest",
  moderate: "Moderate",
  good:     "Good",
  peak:     "Peak",
};

export default function ReadinessCard({ score, label, adaptedFromCheckin }: Props) {
  const color  = LABEL_COLORS[label];
  const display = LABEL_DISPLAY[label];

  const radius = 28;
  const circ   = 2 * Math.PI * radius;
  const filled = circ * (score / 100);

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-card flex flex-col items-center">
      <p className="text-xs font-semibold text-dark/60 uppercase tracking-wide mb-2">
        Readiness
      </p>

      <div className="relative w-16 h-16 mb-2 animate-pulse-ring">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-ghost)" strokeWidth="5" />
          <circle cx="36" cy="36" r={radius} fill="none"
            stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-base text-dark">{score}</span>
        </div>
      </div>

      <span className="text-xs font-semibold px-2 py-0.5 rounded-full mb-1"
        style={{ background: `${color}22`, color }}>
        {display}
      </span>
      {adaptedFromCheckin && (
        <span className="text-xs text-dark/30 font-body">Based on your check-in</span>
      )}
    </div>
  );
}
