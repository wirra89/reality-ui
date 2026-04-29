import { describe, it, expect } from "vitest";
import { PHASE_MATRIX, getLutealSubPhase, getReadinessTier } from "./trainingPrescription";

describe("PHASE_MATRIX", () => {
  const SUB_PHASES = ["menstrual", "follicular", "ovulation", "early_luteal", "late_luteal"] as const;

  it("defines all 5 sub-phases", () => {
    for (const sp of SUB_PHASES) {
      expect(PHASE_MATRIX[sp], `missing sub-phase: ${sp}`).toBeDefined();
    }
  });

  it("every sub-phase has required range fields", () => {
    for (const sp of SUB_PHASES) {
      const row = PHASE_MATRIX[sp];
      expect(row.intensityPercent).toHaveLength(2);
      expect(row.repRange).toHaveLength(2);
      expect(row.sets).toHaveLength(2);
      expect(row.rpe).toHaveLength(2);
      expect(row.rir).toHaveLength(2);
      expect(row.restSeconds).toHaveLength(2);
    }
  });

  it("all ranges have min <= max", () => {
    for (const sp of SUB_PHASES) {
      const row = PHASE_MATRIX[sp];
      expect(row.intensityPercent[0]).toBeLessThanOrEqual(row.intensityPercent[1]);
      expect(row.repRange[0]).toBeLessThanOrEqual(row.repRange[1]);
      expect(row.sets[0]).toBeLessThanOrEqual(row.sets[1]);
      expect(row.rpe[0]).toBeLessThanOrEqual(row.rpe[1]);
      expect(row.rir[0]).toBeLessThanOrEqual(row.rir[1]);
      expect(row.restSeconds[0]).toBeLessThanOrEqual(row.restSeconds[1]);
    }
  });
});

describe("getLutealSubPhase", () => {
  // Default 28-day cycle: luteal runs day 16–28 (13 days)
  // First half: days 16–22, second half: days 23–28

  it("returns early_luteal for first half of luteal window", () => {
    expect(getLutealSubPhase(16, {})).toBe("early_luteal");
    expect(getLutealSubPhase(17, {})).toBe("early_luteal");
    expect(getLutealSubPhase(19, {})).toBe("early_luteal");
    expect(getLutealSubPhase(22, {})).toBe("early_luteal");
  });

  it("returns late_luteal for second half of luteal window", () => {
    expect(getLutealSubPhase(23, {})).toBe("late_luteal");
    expect(getLutealSubPhase(26, {})).toBe("late_luteal");
    expect(getLutealSubPhase(28, {})).toBe("late_luteal");
  });
});

describe("getReadinessTier", () => {
  it("returns 'high' for readinessLabel peak or good", () => {
    expect(getReadinessTier("peak")).toBe("high");
    expect(getReadinessTier("good")).toBe("high");
  });

  it("returns 'moderate' for readinessLabel moderate", () => {
    expect(getReadinessTier("moderate")).toBe("moderate");
  });

  it("returns 'low' for readinessLabel rest", () => {
    expect(getReadinessTier("rest")).toBe("low");
  });
});

import { getPhaseAdjustedPrescription } from "./trainingPrescription";
import type { DailySignals } from "@/lib/sharedSignals";

function makeSignals(overrides: Partial<DailySignals> = {}): DailySignals {
  return {
    phase: "luteal",
    cycleDay: 25,
    readinessScore: 60,
    readinessLabel: "moderate",
    biasTone: "neutral",
    symptomFlags: [],
    energy: null,
    mood: null,
    primaryGoal: null,
    ...overrides,
  };
}

const BASE = { sets: 3, reps: 8, loadType: "weight_reps" as const, targetRPE: 7, restSeconds: 120 };

describe("getPhaseAdjustedPrescription — layer 1 + 2", () => {
  it("ovulation / high readiness → peak intensity upper range", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "ovulation", cycleDay: 14, readinessLabel: "peak" }),
      cycleParams: {},
    });
    expect(result.intensityPercent[0]).toBeGreaterThanOrEqual(75);
    expect(result.intensityPercent[1]).toBeLessThanOrEqual(90);
    expect(result.adjustedRepRange[1]).toBeLessThanOrEqual(8);
    expect(result.shouldSwapExercise).toBe(false);
  });

  it("late luteal / high readiness stays within late_luteal envelope", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "luteal", cycleDay: 26, readinessLabel: "peak" }),
      cycleParams: {},
    });
    // Must not exceed late_luteal ceiling (70%) even with high readiness
    expect(result.intensityPercent[1]).toBeLessThanOrEqual(70);
    expect(result.adjustedRepRange[0]).toBeGreaterThanOrEqual(10);
  });

  it("menstrual / low readiness → reduced sets (min 2)", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "menstrual", cycleDay: 2, readinessLabel: "rest" }),
      cycleParams: {},
    });
    expect(result.adjustedSets).toBe(2);
  });

  it("follicular / moderate readiness → midpoint of follicular range", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "follicular", cycleDay: 8, readinessLabel: "moderate" }),
      cycleParams: {},
    });
    expect(result.intensityPercent[0]).toBeGreaterThanOrEqual(70);
    expect(result.intensityPercent[1]).toBeLessThanOrEqual(85);
  });

  it("returns no swap for normal conditions", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals(),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
    expect(result.suggestedAlternativeType).toBeUndefined();
  });

  it("duration_only loadType returns identity result with no rep/intensity values", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: { sets: 1, reps: 0, loadType: "duration_only" },
      signals: makeSignals(),
      cycleParams: {},
    });
    // Duration exercises don't have rep/intensity prescription
    expect(result.adjustedRepRange).toEqual([0, 0]);
    expect(result.intensityPercent).toEqual([0, 0]);
  });
});

describe("getPhaseAdjustedPrescription — layer 3 symptom override", () => {
  const SEVERE_SYMPTOMS = ["cramps", "heavy bleeding"];

  it("triggers swap when readinessScore < 35 AND severe symptoms present", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        phase: "menstrual",
        cycleDay: 2,
        readinessScore: 20,
        readinessLabel: "rest",
        symptomFlags: SEVERE_SYMPTOMS,
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(true);
    expect(result.suggestedAlternativeType).toBe("mobility");
  });

  it("triggers swap with bodyweight alternative for non-menstrual phases", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        phase: "luteal",
        cycleDay: 26,
        readinessScore: 20,
        readinessLabel: "rest",
        symptomFlags: ["fatigue", "pain"],
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(true);
    expect(result.suggestedAlternativeType).toBe("bodyweight");
  });

  it("does NOT trigger swap if readinessScore >= 35 even with symptoms", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        readinessScore: 40,
        readinessLabel: "rest",
        symptomFlags: SEVERE_SYMPTOMS,
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
  });

  it("does NOT trigger swap if score < 35 but no severe symptoms", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        readinessScore: 20,
        readinessLabel: "rest",
        symptomFlags: ["bloating"],
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
  });

  it("does NOT trigger swap at score exactly 35 (boundary, not < 35)", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ readinessScore: 35, readinessLabel: "rest", symptomFlags: ["cramps"] }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
  });

  it("triggers swap at score exactly 34 (just below threshold)", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ readinessScore: 34, readinessLabel: "rest", symptomFlags: ["cramps"] }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(true);
  });

  it("does NOT trigger swap for duration_only even with severe symptoms and low readiness", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: { sets: 1, reps: 0, loadType: "duration_only" },
      signals: makeSignals({ readinessScore: 20, readinessLabel: "rest", symptomFlags: ["cramps"] }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
  });
});

describe("getPhaseAdjustedPrescription — adjustment reason", () => {
  it("ovulation / high → mentions peak or intensity", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "ovulation", cycleDay: 14, readinessLabel: "peak" }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/peak|intensity/);
  });

  it("late luteal / moderate → mentions rep range or recovery or luteal", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "luteal", cycleDay: 26, readinessLabel: "moderate" }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/rep|recovery|luteal/);
  });

  it("menstrual / any → mentions body or volume or light", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "menstrual", cycleDay: 2, readinessLabel: "rest" }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/body|volume|light/);
  });

  it("swap triggered → mentions alternative or intense or lighter", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        phase: "menstrual", cycleDay: 2,
        readinessScore: 20, readinessLabel: "rest",
        symptomFlags: ["cramps"],
      }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/intense|alternative|lighter/);
  });
});
