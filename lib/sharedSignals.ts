// lib/sharedSignals.ts
// Derives a narrow typed DailySignals contract from TodayState.
// Pure function — no DB calls, no side effects.
// Consumed by AppContext and passed to domain engines (TrainingIntelligenceCard, etc.).

import type { Phase } from "@/types/recipe";
import type { TodayState, ReadinessLabel } from "@/lib/dailyPlan";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BiasTone = "push" | "recover" | "neutral";

export interface DailySignals {
  phase:          Phase;
  cycleDay:       number | null;
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  biasTone:       BiasTone;
  symptomFlags:   string[];
  energy:         number | null;
  mood:           number | null;
  primaryGoal:    string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
