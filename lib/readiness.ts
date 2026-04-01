// lib/readiness.ts
// Standalone readiness service.
// Extracted from ReadinessCard.tsx and centralised here.
// This is Tier 0.2 — delegates to dailyPlan.ts for the actual computation.

import { type Phase } from "@/lib/cycle";
import {
  calcReadinessScore,
  getReadinessLabel,
  type CheckInSnapshot,
  type ReadinessLabel,
} from "@/lib/dailyPlan";

export type { ReadinessLabel };

export interface ReadinessResult {
  score: number;
  label: ReadinessLabel;
  color: string;       // CSS hex for UI usage
  description: string; // short human-readable label
}

const READINESS_META: Record<ReadinessLabel, { color: string; description: string }> = {
  rest:     { color: "#F87171", description: "Rest & recovery today" },
  moderate: { color: "#A78BFA", description: "Moderate effort recommended" },
  good:     { color: "#34D399", description: "Good training day" },
  peak:     { color: "#FBBF24", description: "Peak performance window" },
};

/**
 * Single entry point for readiness across the app.
 * Use this instead of inline calculation in components.
 */
export function getReadiness(
  phase: Phase,
  checkin?: CheckInSnapshot | null
): ReadinessResult {
  const score = calcReadinessScore(phase, checkin);
  const label = getReadinessLabel(score);
  const meta  = READINESS_META[label];
  return {
    score,
    label,
    color: meta.color,
    description: meta.description,
  };
}
