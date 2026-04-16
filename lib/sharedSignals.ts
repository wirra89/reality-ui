// lib/sharedSignals.ts
// Derives a narrow typed DailySignals contract from TodayState.
// Pure function — no DB calls, no side effects.
// Consumed by AppContext and passed to domain engines (TrainingIntelligenceCard, etc.).

import type { Phase } from "@/types/recipe";
import type { TodayState, ReadinessLabel } from "@/lib/dailyPlan";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Derived intensity bias: "push" = encourage high-intensity, "recover" = deload, "neutral" = standard */
export type BiasTone = "push" | "recover" | "neutral";

export interface DailySignals {
  phase:          Phase;
  /** null when the user has not yet configured cycle tracking */
  cycleDay:       number | null;
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  biasTone:       BiasTone;
  /** Title-cased strings matching CheckInSnapshot.symptoms, e.g. "Cramps", "Bloating" */
  symptomFlags:   string[];
  energy:         number | null;
  mood:           number | null;
  primaryGoal:    string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Only "peak" readiness earns "push" bias — "good" readiness is not enough
// because peak-level hormonal priming (ovulation approach) is required to
// justify maximum-intensity training. All other readiness levels get "neutral"
// or "recover".
function deriveBiasTone(label: ReadinessLabel, phase: Phase): BiasTone {
  if (label === "rest") return "recover";
  if (label === "peak" && (phase === "follicular" || phase === "ovulation")) return "push";
  return "neutral";
}

// ── Public API ────────────────────────────────────────────────────────────────

export function extractDailySignals(
  todayState: TodayState,
  extras: {
    phase:        Phase;
    cycleDay:     number | null;
    symptomFlags: string[];
    energy:       number | null;
    mood:         number | null;
    primaryGoal:  string | null;
  },
): DailySignals {
  return {
    phase:          extras.phase,
    cycleDay:       extras.cycleDay,
    readinessScore: todayState.readinessScore,
    readinessLabel: todayState.readinessLabel,
    biasTone:       deriveBiasTone(todayState.readinessLabel, extras.phase),
    symptomFlags:   extras.symptomFlags,
    energy:         extras.energy,
    mood:           extras.mood,
    primaryGoal:    extras.primaryGoal,
  };
}
