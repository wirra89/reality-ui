"use client";

// components/WorkoutCard.tsx
// Refactored in Step 3 — now accepts WorkoutRecommendation from TodayState.
// No longer derives workout type from phaseData directly.

import type { WorkoutRecommendation, WorkoutIntensity } from "@/lib/dailyPlan";

interface Props {
  recommendation: WorkoutRecommendation;
  phase: string; // still needed for icon only
}

const PHASE_ICONS: Record<string, string> = {
  menstrual:  "🧘‍♀️",
  follicular: "🏋️‍♀️",
  ovulation:  "⚡",
  luteal:     "🚴‍♀️",
};

const INTENSITY_WIDTHS: Record<WorkoutIntensity, string> = {
  recovery: "20%",
  light:    "38%",
  moderate: "60%",
  high:     "82%",
  peak:     "100%",
};

const INTENSITY_LABELS: Record<WorkoutIntensity, string> = {
  recovery: "Recovery",
  light:    "Light",
  moderate: "Moderate",
  high:     "High",
  peak:     "Peak",
};

export default function WorkoutCard({ recommendation, phase }: Props) {
  const icon = PHASE_ICONS[phase] ?? "💪";

  return (
    <div
      className="relative rounded-3xl p-5 mb-3 overflow-hidden"
      style={{ background: "var(--color-surface)", borderTop: "3px solid var(--color-primary)" }}
    >
      {/* Accent blob */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle at 80% 20%, #C48A97 0%, transparent 65%)" }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[var(--color-text-dim)] text-xs font-body uppercase tracking-widest mb-1">
            Today's Training
          </p>
          <h2 className="text-dark font-display font-semibold text-xl leading-tight">
            {recommendation.type}
          </h2>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>

      {/* Reasoning */}
      <p className="text-[var(--color-text-mid)] text-sm font-body leading-relaxed mb-5">
        {recommendation.reasoning}
      </p>

      {/* Intensity bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[var(--color-text-dim)] text-xs font-body">Intensity</span>
          <span className="text-dark text-xs font-semibold">
            {INTENSITY_LABELS[recommendation.intensity]}
            {recommendation.duration > 0 && ` · ${recommendation.duration} min`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: INTENSITY_WIDTHS[recommendation.intensity],
              background: "linear-gradient(90deg, #C48A97, #EDD5DB)",
            }}
          />
        </div>
      </div>

      {/* Exercise suggestions — if available */}
      {recommendation.exercises && recommendation.exercises.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {recommendation.exercises.slice(0, 3).map(ex => (
            <span key={ex}
              className="text-xs px-2.5 py-1 rounded-full font-body"
              style={{ background: "rgba(0,0,0,0.04)", color: "var(--color-text-mid)" }}>
              {ex}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
