// lib/progressionEngine.ts
// Pure progression logic: readiness multipliers, target calculation, win detection.
// No DB calls.

import type { ExerciseLog } from "./trainingQueries";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReadinessLabel = "rest" | "moderate" | "good" | "peak";

export type WinCondition =
  | "volume_pr"
  | "weight_pr"
  | "rep_pr"
  | "effort_match"
  | null;

export interface ProgressionTargets {
  targetSets:    number;
  targetReps:    number;
  targetWeight:  number;
  isFirstSession: boolean;
  suggestion:    string;
}

// ── Readiness multiplier ──────────────────────────────────────────────────────

const MULTIPLIERS: Record<ReadinessLabel, number> = {
  rest:     0.85,
  moderate: 0.97,
  good:     1.05,
  peak:     1.10,
};

export function getReadinessMultiplier(label: ReadinessLabel): number {
  return MULTIPLIERS[label];
}

// ── Progression targets ───────────────────────────────────────────────────────

function avgWeight(sets: Array<{ reps: number; weight: number }>): number {
  if (sets.length === 0) return 0;
  const total = sets.reduce((sum, s) => sum + s.weight, 0);
  return total / sets.length;
}

function avgReps(sets: Array<{ reps: number; weight: number }>): number {
  if (sets.length === 0) return 0;
  const total = sets.reduce((sum, s) => sum + s.reps, 0);
  return total / sets.length;
}

export function computeProgressionTargets(
  exerciseName: string,
  lastLog: ExerciseLog | null,
  readinessLabel: ReadinessLabel,
  phase: string,
): ProgressionTargets {
  if (!lastLog || lastLog.sets_data.length === 0) {
    return {
      targetSets:     3,
      targetReps:     8,
      targetWeight:   0,
      isFirstSession: true,
      suggestion:     `First session for ${exerciseName} — focus on form and feel out the weight.`,
    };
  }

  const multiplier  = getReadinessMultiplier(readinessLabel);
  const lastWeight  = avgWeight(lastLog.sets_data);
  const lastReps    = avgReps(lastLog.sets_data);
  const lastSets    = lastLog.sets_data.length;

  // Round target weight to nearest 1.25 kg plate increment
  const rawWeight = lastWeight * multiplier;
  const targetWeight = Math.round(rawWeight / 1.25) * 1.25;

  // Reps: stay same for rest/moderate, +1 for good, +2 for peak
  const repDelta = readinessLabel === "peak" ? 2 : readinessLabel === "good" ? 1 : 0;
  const targetReps = Math.max(1, Math.round(lastReps + repDelta));

  // Sets: deload on rest, maintain otherwise
  const targetSets = readinessLabel === "rest" ? Math.max(2, lastSets - 1) : lastSets;

  let suggestion: string;
  if (readinessLabel === "rest") {
    suggestion = `Deload day — reduce to ${targetSets}×${targetReps} @ ${targetWeight}kg and focus on technique.`;
  } else if (readinessLabel === "peak") {
    suggestion = `Strong readiness — push to ${targetSets}×${targetReps} @ ${targetWeight}kg.`;
  } else {
    suggestion = `Target ${targetSets}×${targetReps} @ ${targetWeight}kg based on last session.`;
  }

  return { targetSets, targetReps, targetWeight, isFirstSession: false, suggestion };
}

// ── Win condition detection ───────────────────────────────────────────────────

export function detectWinCondition(
  actualSets: Array<{ reps: number; weight: number }>,
  lastLog: ExerciseLog | null,
): WinCondition {
  if (!lastLog || lastLog.sets_data.length === 0) return null;

  const actualVolume = actualSets.reduce((s, set) => s + set.reps * set.weight, 0);
  const lastVolume   = lastLog.total_volume_kg > 0
    ? lastLog.total_volume_kg
    : lastLog.sets_data.reduce((s, set) => s + set.reps * set.weight, 0);

  const lastMaxWeight   = Math.max(...lastLog.sets_data.map(s => s.weight));
  const actualMaxWeight = Math.max(...actualSets.map(s => s.weight));

  const lastMaxReps   = Math.max(...lastLog.sets_data.map(s => s.reps));
  const actualMaxReps = Math.max(...actualSets.map(s => s.reps));

  if (actualMaxWeight > lastMaxWeight)          return "weight_pr";
  if (actualVolume > lastVolume * 1.05)         return "volume_pr";
  if (actualMaxReps > lastMaxReps)              return "rep_pr";
  if (Math.abs(actualVolume - lastVolume) / lastVolume < 0.05) return "effort_match";

  return null;
}
