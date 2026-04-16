import { describe, it, expect } from "vitest";
import {
  getReadinessMultiplier,
  computeProgressionTargets,
  detectWinCondition,
} from "./progressionEngine";
import type { ExerciseLog } from "./trainingQueries";

const LAST_LOG: ExerciseLog = {
  exercise_name: "Squat",
  exercise_id:   "squat",
  workout_type:  "strength_lower",
  phase:         "follicular",
  cycle_day:     8,
  sets_data:     [{ reps: 5, weight: 60 }, { reps: 5, weight: 60 }, { reps: 5, weight: 60 }],
  total_volume_kg: 900,
};

describe("getReadinessMultiplier", () => {
  it("returns a multiplier below 1 for rest", () => {
    expect(getReadinessMultiplier("rest")).toBeLessThan(1);
  });

  it("returns 1.0 for moderate", () => {
    expect(getReadinessMultiplier("moderate")).toBeCloseTo(1.0, 1);
  });

  it("returns above 1 for good and peak", () => {
    expect(getReadinessMultiplier("good")).toBeGreaterThan(1);
    expect(getReadinessMultiplier("peak")).toBeGreaterThan(1);
  });

  it("peak multiplier > good multiplier", () => {
    expect(getReadinessMultiplier("peak")).toBeGreaterThan(getReadinessMultiplier("good"));
  });
});

describe("computeProgressionTargets", () => {
  it("returns targets with sets, reps, and weight", () => {
    const result = computeProgressionTargets("Squat", LAST_LOG, "good", "follicular");
    expect(result.targetSets).toBeGreaterThan(0);
    expect(result.targetReps).toBeGreaterThan(0);
    expect(result.targetWeight).toBeGreaterThan(0);
  });

  it("target weight is higher at peak readiness vs rest", () => {
    const peak = computeProgressionTargets("Squat", LAST_LOG, "peak", "follicular");
    const rest = computeProgressionTargets("Squat", LAST_LOG, "rest", "follicular");
    expect(peak.targetWeight).toBeGreaterThan(rest.targetWeight);
  });

  it("returns baseline targets when lastLog is null", () => {
    const result = computeProgressionTargets("Squat", null, "good", "follicular");
    expect(result.targetSets).toBe(3);
    expect(result.targetReps).toBe(8);
    expect(result.targetWeight).toBe(0);
    expect(result.isFirstSession).toBe(true);
  });

  it("suggests deload on rest readiness", () => {
    const result = computeProgressionTargets("Squat", LAST_LOG, "rest", "menstrual");
    expect(result.targetWeight).toBeLessThan(LAST_LOG.sets_data[0].weight);
  });
});

describe("detectWinCondition", () => {
  it("detects a volume PR when total volume exceeds last log", () => {
    const actualSets = [
      { reps: 6, weight: 60 },
      { reps: 6, weight: 60 },
      { reps: 6, weight: 60 },
    ];
    const win = detectWinCondition(actualSets, LAST_LOG);
    expect(win).toBe("volume_pr");
  });

  it("detects a weight PR when any set uses more weight", () => {
    const actualSets = [
      { reps: 5, weight: 65 },
      { reps: 5, weight: 65 },
      { reps: 4, weight: 65 },
    ];
    const win = detectWinCondition(actualSets, LAST_LOG);
    expect(win).toBe("weight_pr");
  });

  it("returns effort_match when volume is within 5% of last log", () => {
    const actualSets = [
      { reps: 5, weight: 60 },
      { reps: 5, weight: 60 },
      { reps: 5, weight: 60 },
    ];
    const win = detectWinCondition(actualSets, LAST_LOG);
    expect(win).toBe("effort_match");
  });

  it("returns null when lastLog is null", () => {
    const actualSets = [{ reps: 5, weight: 60 }];
    expect(detectWinCondition(actualSets, null)).toBeNull();
  });
});
