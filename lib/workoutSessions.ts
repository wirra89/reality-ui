// lib/workoutSessions.ts
import { supabase, getUser } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateExercise {
  exercise_id?: string;
  name: string;
  order_index: number;
  default_sets: number;
  default_rep_range: string; // e.g. "8-12"
  note?: string;
}

export interface NewWorkoutTemplate {
  id: number;
  user_id: string;
  name: string;
  phase_tags: string[];
  exercises: TemplateExercise[];
  created_at: string;
  updated_at: string;
}

export interface SessionSet {
  reps: number | null;
  weight: number | null;
  done: boolean;
}

export interface SessionExercise {
  exercise_id?: string;
  name: string;
  note?: string;
  sets: SessionSet[];
  lastSession?: { sets: Array<{ reps: number | null; weight: number | null }> };
}

export interface ActiveSession {
  templateId: number | null; // null for Quick Workout
  templateName: string;
  startedAt: string;
  exercises: SessionExercise[];
}

// ── Template CRUD ─────────────────────────────────────────────────────────────

export async function getTemplates(): Promise<NewWorkoutTemplate[]> {
  const user = await getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("workout_templates")
    .select("id, user_id, name, phase_tags, exercises, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    phase_tags: row.phase_tags ?? [],
    exercises: Array.isArray(row.exercises) ? (row.exercises as TemplateExercise[]) : [],
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }));
}

export async function getTemplate(id: number): Promise<NewWorkoutTemplate | null> {
  const user = await getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("workout_templates")
    .select("id, user_id, name, phase_tags, exercises, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    phase_tags: data.phase_tags ?? [],
    exercises: Array.isArray(data.exercises) ? (data.exercises as TemplateExercise[]) : [],
    created_at: data.created_at,
    updated_at: data.updated_at ?? data.created_at,
  };
}

export async function saveNewTemplate(
  template: Pick<NewWorkoutTemplate, "name" | "phase_tags" | "exercises"> & { id?: number }
): Promise<{ success: boolean; id?: number; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };
  const now = new Date().toISOString();
  if (template.id) {
    const { error } = await supabase
      .from("workout_templates")
      .update({
        name: template.name,
        phase_tags: template.phase_tags,
        exercises: template.exercises,
        updated_at: now,
      })
      .eq("id", template.id)
      .eq("user_id", user.id);
    return error ? { success: false, error: error.message } : { success: true, id: template.id };
  } else {
    const { data, error } = await supabase
      .from("workout_templates")
      .insert([{
        user_id: user.id,
        name: template.name,
        phase_tags: template.phase_tags,
        exercises: template.exercises,
        updated_at: now,
        // legacy column — keep compatible with existing table
        phase: template.phase_tags[0] ?? "all",
      }])
      .select("id")
      .single();
    return error ? { success: false, error: error.message } : { success: true, id: data?.id };
  }
}

export async function deleteNewTemplate(id: number): Promise<{ success: boolean }> {
  const user = await getUser();
  if (!user) return { success: false };
  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { success: !error };
}

// ── Session CRUD ──────────────────────────────────────────────────────────────

/** Enrich SessionExercises with last-session comparison data.
 *  Match priority: exercise_id (exact) → name (case-insensitive).
 *  Only uses COMPLETED sessions. */
export async function enrichWithLastSession(
  exercises: SessionExercise[]
): Promise<SessionExercise[]> {
  const user = await getUser();
  if (!user) return exercises;

  // Fetch all completed sessions for this user (limit 50, enough for matching)
  const { data, error } = await supabase
    .from("workouts")
    .select("exercises")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data || data.length === 0) return exercises;

  // Build lookup maps: first occurrence wins (most recent session is first)
  const byId: Record<string, Array<{ reps: string; weight: string }>> = {};
  const byName: Record<string, Array<{ reps: string; weight: string }>> = {};

  for (const session of data) {
    const exs = session.exercises as Array<{ exercise_id?: string; name: string; sets: Array<{ reps: string; weight: string }> }>;
    for (const ex of exs) {
      if (ex.exercise_id && !byId[ex.exercise_id]) {
        byId[ex.exercise_id] = ex.sets;
      }
      const key = ex.name.toLowerCase();
      if (!byName[key]) {
        byName[key] = ex.sets;
      }
    }
  }

  return exercises.map((ex) => {
    let matchedSets: Array<{ reps: string; weight: string }> | undefined;
    if (ex.exercise_id && byId[ex.exercise_id]) {
      matchedSets = byId[ex.exercise_id];
    } else {
      matchedSets = byName[ex.name.toLowerCase()];
    }
    if (!matchedSets) return ex;
    return {
      ...ex,
      lastSession: {
        sets: matchedSets.map((s) => ({
          reps: s.reps ? parseFloat(s.reps) : null,
          weight: s.weight ? parseFloat(s.weight) : null,
        })),
      },
    };
  });
}

/** Save a completed or abandoned session */
export async function saveSession(
  session: ActiveSession,
  status: "completed" | "abandoned",
  cycleDay: number,
  phase: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not logged in" };

  // Convert SessionExercise[] → the format existing workouts table expects
  const exercises = session.exercises.map((ex) => ({
    exercise_id: ex.exercise_id,
    name: ex.name,
    sets: ex.sets.map((s) => ({
      reps: s.reps !== null ? String(s.reps) : "",
      weight: s.weight !== null ? String(s.weight) : "",
    })),
  }));

  const { error } = await supabase.from("workouts").insert([{
    user_id: user.id,
    name: session.templateName,
    cycle_day: cycleDay,
    phase,
    template_id: session.templateId,
    status,
    exercises,
  }]);

  return error ? { success: false, error: error.message } : { success: true };
}
