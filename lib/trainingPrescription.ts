// lib/trainingPrescription.ts
// All imports upfront — used across tasks 1–6
import { getPhaseBoundaries, type CycleParams } from "@/lib/cycle";
import type { DailySignals } from "@/lib/sharedSignals";
import type { ReadinessLabel } from "@/lib/dailyPlan";

// ── Public types ──────────────────────────────────────────────────────────────

export interface BasePrescription {
  sets: number;
  reps: number;
  loadType: "weight_reps" | "reps_only" | "duration_only";
  targetRPE?: number;
  restSeconds?: number;
}

export interface PrescriptionResult {
  adjustedSets: number;
  adjustedRepRange: [number, number];
  intensityPercent: [number, number];
  targetRPE: [number, number];
  targetRIR: [number, number];
  restSeconds: [number, number];
  adjustmentReason: string;
  shouldSwapExercise: boolean;
  suggestedAlternativeType?: "bodyweight" | "mobility";
}

// ── Phase matrix (private) ────────────────────────────────────────────────────

type SubPhase = "menstrual" | "follicular" | "ovulation" | "early_luteal" | "late_luteal";

interface PhaseRow {
  intensityPercent: [number, number];
  repRange:         [number, number];
  sets:             [number, number];
  rpe:              [number, number];
  rir:              [number, number];
  restSeconds:      [number, number];
}

export const PHASE_MATRIX: Record<SubPhase, PhaseRow> = {
  menstrual:    { intensityPercent: [50, 65], repRange: [10, 15], sets: [2, 3], rpe: [5, 7], rir: [3, 5], restSeconds: [60,  90]  },
  follicular:   { intensityPercent: [70, 85], repRange: [6,  10], sets: [3, 5], rpe: [7, 9], rir: [1, 3], restSeconds: [90,  150] },
  ovulation:    { intensityPercent: [75, 90], repRange: [4,  8],  sets: [3, 5], rpe: [8, 9], rir: [1, 2], restSeconds: [120, 180] },
  early_luteal: { intensityPercent: [65, 80], repRange: [8,  12], sets: [3, 4], rpe: [7, 8], rir: [2, 3], restSeconds: [90,  120] },
  late_luteal:  { intensityPercent: [55, 70], repRange: [10, 15], sets: [2, 4], rpe: [6, 7], rir: [3, 4], restSeconds: [60,  90]  },
};

/** Splits the luteal phase into early (first half) and late (second half). */
export function getLutealSubPhase(cycleDay: number, cycleParams: CycleParams): "early_luteal" | "late_luteal" {
  const b = getPhaseBoundaries(cycleParams);
  const lutealMid = Math.floor((b.luteal.start + b.luteal.end) / 2);
  return cycleDay <= lutealMid ? "early_luteal" : "late_luteal";
}

type ReadinessTier = "high" | "moderate" | "low";

export function getReadinessTier(label: ReadinessLabel): ReadinessTier {
  if (label === "peak" || label === "good") return "high";
  if (label === "moderate") return "moderate";
  return "low"; // "rest"
}

// ── Stub (replaced in Task 6) ─────────────────────────────────────────────────
function buildAdjustmentReason(
  subPhase: SubPhase,
  tier: ReadinessTier,
  swapTriggered: boolean,
): string {
  return `${subPhase} / ${tier}`; // placeholder — replaced in Task 6
}

// ── Layer 1 + 2: phase-adjusted prescription ──────────────────────────────────

export function getPhaseAdjustedPrescription({
  basePrescription,
  signals,
  cycleParams = {},
}: {
  basePrescription: BasePrescription;
  signals: DailySignals;
  cycleParams?: CycleParams;
}): PrescriptionResult {
  // Duration-only exercises: no rep/intensity prescription
  if (basePrescription.loadType === "duration_only") {
    return {
      adjustedSets: basePrescription.sets,
      adjustedRepRange: [0, 0],
      intensityPercent: [0, 0],
      targetRPE: [0, 0],
      targetRIR: [0, 0],
      restSeconds: [0, 0],
      adjustmentReason: "",
      shouldSwapExercise: false,
    };
  }

  // ── Layer 1: resolve sub-phase ─────────────────────────────────────────────
  const subPhase: SubPhase =
    signals.phase === "luteal"
      ? getLutealSubPhase(signals.cycleDay ?? 20, cycleParams)
      : signals.phase;

  const row = PHASE_MATRIX[subPhase];

  // ── Layer 2: readiness modifier (within phase envelope only) ───────────────
  const tier = getReadinessTier(signals.readinessLabel);

  function pick(range: [number, number]): [number, number] {
    if (tier === "high")     return range;
    if (tier === "moderate") {
      const mid = Math.round((range[0] + range[1]) / 2);
      return [range[0], mid];
    }
    // low
    return [range[0], range[0]];
  }

  const baseSets = tier === "low"
    ? Math.max(2, row.sets[0] - 1)
    : row.sets[0];

  return {
    adjustedSets:     baseSets,
    adjustedRepRange: pick(row.repRange),
    intensityPercent: pick(row.intensityPercent),
    targetRPE:        pick(row.rpe),
    targetRIR:        pick(row.rir),
    restSeconds:      pick(row.restSeconds),
    adjustmentReason: buildAdjustmentReason(subPhase, tier, false),
    shouldSwapExercise: false,
  };
}
