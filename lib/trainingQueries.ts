// lib/trainingQueries.ts
// Re-exports DB functions for exercise logs from lib/supabase.ts.
// Kept separate so components import from a single training-scoped module.

export {
  saveExerciseLog,
  getExerciseLogsForPhaseAndType,
  getExerciseHistory,
  type ExerciseLog,
} from "./supabase";
