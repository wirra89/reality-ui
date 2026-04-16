// lib/exerciseSelector.ts
// Selects exercises from the library for a given workout type + phase.
// No DB calls. Reads the static EXERCISES array from lib/exercises.ts.

import { EXERCISES } from "./exercises";
import type { Exercise } from "./exercises";
import type { WorkoutTypeId, EquipmentLevel } from "./trainingEngine";
import type { Phase } from "@/types/recipe";

// ── Muscle group targets per workout type ─────────────────────────────────────

export const WORKOUT_TYPE_MUSCLE_MAP: Record<WorkoutTypeId, string[]> = {
  strength_lower:    ["glutes", "legs"],
  strength_upper:    ["chest", "back", "shoulders", "arms"],
  strength_full:     ["glutes", "legs", "back", "chest", "shoulders"],
  hypertrophy_lower: ["glutes", "legs", "core"],
  hypertrophy_upper: ["chest", "back", "shoulders", "arms"],
  hiit_cardio:       ["cardio", "core", "legs"],
  circuit_full:      ["glutes", "legs", "chest", "back", "core"],
  cardio_moderate:   ["cardio"],
  mobility_recovery: ["core", "legs", "glutes", "back"],
  bodyweight_light:  ["core", "glutes", "legs", "back"],
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

/**
 * Returns exercises from the library filtered by workout type, phase, and equipment.
 * Sorted: phase-specific first, then "all", then alphabetically.
 */
export function selectExercisesForWorkout(
  workoutTypeId: WorkoutTypeId,
  phase: Phase,
  options: ExerciseSelectorOptions = {},
): Exercise[] {
  const { equipmentLevel = "gym", limit = 6, excludeIds = [] } = options;
  const targetMuscles = WORKOUT_TYPE_MUSCLE_MAP[workoutTypeId] ?? [];
  const allowedEquipment = EQUIPMENT_TIERS[equipmentLevel];

  return EXERCISES
    .filter(ex => {
      if (excludeIds.includes(ex.id)) return false;

      const phaseMatch = ex.phases.includes(phase) || ex.phases.includes("all");
      if (!phaseMatch) return false;

      const muscleMatch = targetMuscles.includes(ex.muscle);
      if (!muscleMatch) return false;

      // Only restrict equipment when not "gym" level
      if (equipmentLevel !== "gym" && allowedEquipment.length > 0) {
        const eq = ex.equipment.toLowerCase();
        if (!allowedEquipment.includes(eq)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aPhaseSpecific = a.phases.includes(phase) && !a.phases.includes("all");
      const bPhaseSpecific = b.phases.includes(phase) && !b.phases.includes("all");
      if (aPhaseSpecific && !bPhaseSpecific) return -1;
      if (!aPhaseSpecific && bPhaseSpecific) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
