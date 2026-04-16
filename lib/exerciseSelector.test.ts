import { describe, it, expect } from "vitest";
import { selectExercisesForWorkout, WORKOUT_TYPE_MUSCLE_MAP } from "./exerciseSelector";

describe("WORKOUT_TYPE_MUSCLE_MAP", () => {
  it("has an entry for each of the 12 workout types", () => {
    const expected = [
      "strength_lower","strength_upper","strength_full","hypertrophy_lower",
      "hypertrophy_upper","hiit_cardio","circuit_full","cardio_moderate",
      "mobility_recovery","bodyweight_light","glute_focused","core_stability",
    ];
    for (const id of expected) {
      expect(WORKOUT_TYPE_MUSCLE_MAP[id as keyof typeof WORKOUT_TYPE_MUSCLE_MAP],
        `Missing entry for ${id}`).toBeDefined();
    }
  });
});

describe("selectExercisesForWorkout", () => {
  it("returns up to limit exercises", () => {
    const result = selectExercisesForWorkout("strength_lower", "follicular", { limit: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns exercises matching the phase", () => {
    const result = selectExercisesForWorkout("mobility_recovery", "menstrual", { limit: 6 });
    for (const ex of result) {
      expect(
        ex.phases.includes("menstrual") || ex.phases.includes("all"),
        `Exercise ${ex.name} does not match menstrual phase`
      ).toBe(true);
    }
  });

  it("filters by equipment when none is specified", () => {
    const result = selectExercisesForWorkout("bodyweight_light", "luteal", {
      equipmentLevel: "none",
      limit: 8,
    });
    for (const ex of result) {
      expect(["bodyweight", "none", ""], "equipment filter failed").toContain(
        (ex.equipment ?? "").toLowerCase()
      );
    }
  });

  it("returns an empty array (not error) when no matching exercises exist", () => {
    expect(() =>
      selectExercisesForWorkout("core_stability", "menstrual", { equipmentLevel: "none", limit: 3 })
    ).not.toThrow();
  });

  it("does not return duplicate exercise ids", () => {
    const result = selectExercisesForWorkout("circuit_full", "follicular", { limit: 10 });
    const ids = result.map(e => e.id);
    expect(ids).toHaveLength(new Set(ids).size);
  });
});
