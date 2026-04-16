import { describe, it, expect } from "vitest";
import { scoreWorkoutTypes, buildTrainingInput, WORKOUT_TYPES } from "./trainingEngine";

const BASE_INPUT = buildTrainingInput({
  phase: "follicular",
  cycleDay: 8,
  readinessScore: 72,
  readinessLabel: "good",
  symptoms: [],
  goal: null,
  energy: 4,
  equipmentLevel: "gym",
  availableMinutes: 60,
  recentWorkoutTypes: [],
});

describe("WORKOUT_TYPES", () => {
  it("defines exactly 12 workout types", () => {
    expect(Object.keys(WORKOUT_TYPES)).toHaveLength(12);
  });

  it("each workout type has required fields", () => {
    for (const [id, def] of Object.entries(WORKOUT_TYPES)) {
      expect(def.name, `${id} missing name`).toBeTruthy();
      expect(def.phases.length, `${id} missing phases`).toBeGreaterThan(0);
      expect(def.intensities.length, `${id} missing intensities`).toBeGreaterThan(0);
      expect(def.durationMin, `${id} missing durationMin`).toBeGreaterThan(0);
    }
  });
});

describe("scoreWorkoutTypes", () => {
  it("returns a primary and fallback recommendation", () => {
    const result = scoreWorkoutTypes(BASE_INPUT);
    expect(result.primary).toBeDefined();
    expect(result.fallback).toBeDefined();
    expect(result.primary.workoutTypeId).not.toBe(result.fallback.workoutTypeId);
  });

  it("primary score is >= fallback score", () => {
    const result = scoreWorkoutTypes(BASE_INPUT);
    expect(result.primary.score).toBeGreaterThanOrEqual(result.fallback.score);
  });

  it("returns recovery type as primary when readiness is very low", () => {
    const restInput = buildTrainingInput({
      ...BASE_INPUT,
      readinessScore: 18,
      readinessLabel: "rest",
      energy: 1,
    });
    const result = scoreWorkoutTypes(restInput);
    expect(["mobility_recovery", "bodyweight_light"]).toContain(result.primary.workoutTypeId);
  });

  it("boosts strength types at high readiness during follicular/ovulation", () => {
    const peakInput = buildTrainingInput({
      ...BASE_INPUT,
      phase: "ovulation",
      readinessScore: 90,
      readinessLabel: "peak",
      energy: 5,
    });
    const result = scoreWorkoutTypes(peakInput);
    expect(["strength_lower","strength_upper","strength_full","hypertrophy_lower","hypertrophy_upper"]).toContain(result.primary.workoutTypeId);
  });

  it("penalises a workout type repeated in the last 3 sessions", () => {
    const withRepeat = buildTrainingInput({
      ...BASE_INPUT,
      recentWorkoutTypes: ["strength_lower", "strength_lower", "strength_lower"],
    });
    const withoutRepeat = buildTrainingInput({ ...BASE_INPUT, recentWorkoutTypes: [] });
    const r1 = scoreWorkoutTypes(withRepeat);
    const r2 = scoreWorkoutTypes(withoutRepeat);
    const r1StrengthScore = r1.allScored.find(s => s.workoutTypeId === "strength_lower")?.score ?? 0;
    const r2StrengthScore = r2.allScored.find(s => s.workoutTypeId === "strength_lower")?.score ?? 0;
    expect(r1StrengthScore).toBeLessThan(r2StrengthScore);
  });

  it("adds bloating symptom adjustment (reduces high intensity types)", () => {
    const withBloat = buildTrainingInput({
      ...BASE_INPUT,
      symptoms: ["bloating"],
    });
    const result = scoreWorkoutTypes(withBloat);
    const hiitScore = result.allScored.find(s => s.workoutTypeId === "hiit_cardio")?.score ?? 0;
    const mobilityScore = result.allScored.find(s => s.workoutTypeId === "mobility_recovery")?.score ?? 0;
    expect(mobilityScore).toBeGreaterThan(hiitScore);
  });

  it("matchReasons is non-empty for primary result", () => {
    const result = scoreWorkoutTypes(BASE_INPUT);
    expect(result.primary.matchReasons.length).toBeGreaterThan(0);
  });

  it("matchReasons is capped at 3 entries", () => {
    const richInput = buildTrainingInput({
      ...BASE_INPUT,
      phase: "follicular",
      readinessScore: 85,
      readinessLabel: "good",
      symptoms: ["cramps"],
      goal: "muscle_gain",
      energy: 5,
      availableMinutes: 45,
    });
    const result = scoreWorkoutTypes(richInput);
    expect(result.primary.matchReasons.length).toBeLessThanOrEqual(3);
  });
});
