// lib/exerciseSelector.ts
// Selects exercises from the library for a given workout type + phase.
// No DB calls. Reads the static EXERCISES array from lib/exercises.ts.

import { EXERCISES } from "./exercises";
import type { Exercise } from "./exercises";
import type { WorkoutTypeId, EquipmentLevel } from "./trainingEngine";
import type { Phase } from "@/types/recipe";

// ── Muscle group targets per workout type ─────────────────────────────────────
// Order matters: primary muscles listed first, accessory muscles after.
// The sort logic uses this order to prioritise primary-muscle exercises.

export const WORKOUT_TYPE_MUSCLE_MAP: Record<WorkoutTypeId, string[]> = {
  strength_lower:    ["legs", "glutes"],
  strength_upper:    ["back", "chest", "shoulders", "arms"],
  strength_full:     ["legs", "back", "glutes", "chest", "shoulders"],
  hypertrophy_lower: ["legs", "glutes", "core"],
  hypertrophy_upper: ["back", "chest", "shoulders", "arms"],
  hiit_cardio:       ["cardio", "legs", "core"],
  circuit_full:      ["legs", "glutes", "back", "chest", "core"],
  cardio_moderate:   ["cardio"],
  mobility_recovery: ["legs", "back", "glutes", "core"],
  bodyweight_light:  ["legs", "glutes", "back", "core"],
  glute_focused:     ["glutes", "legs"],
  core_stability:    ["core", "back"],
};

// Equipment values allowed per level.
// The Exercise type uses: "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable" | "cardio" | "other"
// "none" level → bodyweight only; "minimal" → bodyweight + dumbbells; "gym" → unrestricted
const EQUIPMENT_TIERS: Record<EquipmentLevel, string[]> = {
  none:    ["bodyweight"],
  minimal: ["bodyweight", "dumbbell"],
  gym:     [], // empty = unrestricted
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface ExerciseSelectorOptions {
  equipmentLevel?: EquipmentLevel;
  limit?: number;
  excludeIds?: string[];
}

// Difficulty ordering: advanced compound movements first, beginner/isolation last
const DIFFICULTY_ORDER: Record<string, number> = { advanced: 0, intermediate: 1, beginner: 2 };

// Equipment ordering: free weights and barbells before machines before bodyweight/cardio
// (compound barbell/dumbbell work should precede machine accessory work)
const EQUIPMENT_ORDER: Record<string, number> = {
  barbell: 0, dumbbell: 1, cable: 2, machine: 3, bodyweight: 4, cardio: 5, other: 6,
};

/**
 * Returns exercises from the library filtered by workout type, phase, and equipment.
 *
 * Sort priority (most important first):
 * 1. Primary muscle matches first (first muscles in WORKOUT_TYPE_MUSCLE_MAP)
 * 2. Phase-specific exercises before "all"
 * 3. Advanced before intermediate before beginner (compounds first)
 * 4. Free weights (barbell/dumbbell) before machines before bodyweight
 * 5. Alphabetical tiebreaker
 */
export function selectExercisesForWorkout(
  workoutTypeId: WorkoutTypeId,
  phase: Phase,
  options: ExerciseSelectorOptions = {},
): Exercise[] {
  const { equipmentLevel = "gym", limit = 6, excludeIds = [] } = options;
  const targetMuscles = WORKOUT_TYPE_MUSCLE_MAP[workoutTypeId] ?? [];
  const allowedEquipment = EQUIPMENT_TIERS[equipmentLevel];

  // Primary muscles = first half of the list (they come first in the output)
  const primaryCutoff = Math.ceil(targetMuscles.length / 2);
  const primaryMuscles = new Set(targetMuscles.slice(0, primaryCutoff));

  return EXERCISES
    .filter(ex => {
      if (excludeIds.includes(ex.id)) return false;

      const phaseMatch = ex.phases.includes(phase) || ex.phases.includes("all");
      if (!phaseMatch) return false;

      const muscleMatch = targetMuscles.includes(ex.muscle);
      if (!muscleMatch) return false;

      if (equipmentLevel !== "gym" && allowedEquipment.length > 0) {
        const eq = ex.equipment.toLowerCase();
        if (!allowedEquipment.includes(eq)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // 1. Primary muscle first
      const aPrimary = primaryMuscles.has(a.muscle) ? 0 : 1;
      const bPrimary = primaryMuscles.has(b.muscle) ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;

      // 2. Phase-specific before "all"
      const aPhaseSpec = a.phases.includes(phase) && !a.phases.includes("all") ? 0 : 1;
      const bPhaseSpec = b.phases.includes(phase) && !b.phases.includes("all") ? 0 : 1;
      if (aPhaseSpec !== bPhaseSpec) return aPhaseSpec - bPhaseSpec;

      // 3. Difficulty: advanced → intermediate → beginner
      const aDiff = DIFFICULTY_ORDER[a.difficulty] ?? 1;
      const bDiff = DIFFICULTY_ORDER[b.difficulty] ?? 1;
      if (aDiff !== bDiff) return aDiff - bDiff;

      // 4. Equipment: barbell → dumbbell → cable → machine → bodyweight
      const aEquip = EQUIPMENT_ORDER[a.equipment] ?? 6;
      const bEquip = EQUIPMENT_ORDER[b.equipment] ?? 6;
      if (aEquip !== bEquip) return aEquip - bEquip;

      // 5. Alphabetical
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
