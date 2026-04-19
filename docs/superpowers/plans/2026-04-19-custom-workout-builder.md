# Custom Workout Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a template-based workout system with active session logging, last-session comparison per exercise, progressive overload prompts, and a Quick Workout ad-hoc path.

**Architecture:** New `lib/workoutSessions.ts` holds all types and Supabase CRUD. New Next.js routes under `app/training/builder/` and `app/training/session/` handle template editing and active sessions. A shared `WorkoutExerciseRow` component handles per-set input with last-session ghost rows. The existing `app/training/page.tsx` is extended with a "My Workouts" launcher section — existing inline workout logger is untouched.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase JS client (already configured in `lib/supabase.ts`), no new npm dependencies.

---

## Codebase Context (read before starting any task)

- Design tokens: `bg-background` = `#F5E8EB`, `bg-surface` / `var(--color-surface)` = `#FEF7F8`, `shadow-card`, `text-dark`, `text-secondary`, `text-primary` = `#C48A97`
- Phase colours: menstrual `#F87171`, follicular `#34D399`, ovulation `#FBBF24`, luteal `#A78BFA`
- Gradient button: `background: "linear-gradient(135deg, #C48A97, #7B6D8D)"` with `text-white`
- Supabase client: `import { supabase } from "@/lib/supabase"` — already exports a singleton client
- Auth helper: `import { getUser } from "@/lib/supabase"` — returns `User | null`
- Every page needs `"use client"` at the top and redirects `if (!loading && !user) router.replace("/auth")`
- Existing `WorkoutTemplate` in `lib/supabase.ts` uses `id?: number` (integer PK) — **do not rename it** — the new type in `workoutSessions.ts` is `NewWorkoutTemplate`
- Existing `workout_templates` table columns: `id` (bigint serial), `user_id`, `created_at`, `name`, `phase` (text), `exercises` (jsonb)
- Existing `workouts` table columns: `id` (bigint serial), `user_id`, `created_at`, `name`, `cycle_day`, `phase`, `workout_type`, `exercises` (jsonb)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260419_workout_builder.sql` | Create | ALTER TABLE: add template_id, status, phase_tags, updated_at |
| `lib/workoutSessions.ts` | Create | All new types + Supabase CRUD for builder/sessions |
| `components/WorkoutExerciseRow.tsx` | Create | Per-set input row with last-session comparison |
| `app/training/builder/page.tsx` | Create | Template list page |
| `app/training/builder/[id]/page.tsx` | Create | Template editor page |
| `app/training/session/[templateId]/page.tsx` | Create | Active session from template |
| `app/training/session/quick/page.tsx` | Create | Ad-hoc quick workout session |
| `app/training/page.tsx` | Modify | Add My Workouts section + Quick Workout entry (additive only) |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260419_workout_builder.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260419_workout_builder.sql
-- Add template_id and status to workouts table
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS template_id bigint REFERENCES workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'abandoned'));

-- Add phase_tags and updated_at to workout_templates table
ALTER TABLE workout_templates
  ADD COLUMN IF NOT EXISTS phase_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill updated_at from created_at for existing rows
UPDATE workout_templates SET updated_at = created_at WHERE updated_at IS NULL;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL above targeting the herphase project.

Alternatively, copy the SQL to the Supabase dashboard SQL editor and run it.

- [ ] **Step 3: Verify columns exist**

Use `mcp__claude_ai_Supabase__execute_sql` to run:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workouts' AND column_name IN ('template_id', 'status');
```
Expected: 2 rows — `template_id` nullable bigint, `status` non-nullable text.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260419_workout_builder.sql
git commit -m "feat: add template_id/status to workouts, phase_tags/updated_at to workout_templates"
```

---

## Task 2: lib/workoutSessions.ts

**Files:**
- Create: `lib/workoutSessions.ts`

This file contains all new types and Supabase functions for the builder. It does **not** modify or replace the existing functions in `lib/supabase.ts`.

- [ ] **Step 1: Write the full file**

```typescript
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
  const { data } = await supabase
    .from("workout_templates")
    .select("id, user_id, name, phase_tags, exercises, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    phase_tags: row.phase_tags ?? [],
    exercises: (row.exercises as TemplateExercise[]) ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  }));
}

export async function getTemplate(id: number): Promise<NewWorkoutTemplate | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workout_templates")
    .select("id, user_id, name, phase_tags, exercises, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    phase_tags: data.phase_tags ?? [],
    exercises: (data.exercises as TemplateExercise[]) ?? [],
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

/** Get last COMPLETED session for a given template */
export async function getLastSessionForTemplate(
  templateId: number
): Promise<{ exercises: Array<{ exercise_id?: string; name: string; sets: Array<{ reps: string; weight: string }> }> } | null> {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workouts")
    .select("exercises")
    .eq("user_id", user.id)
    .eq("template_id", templateId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  return { exercises: data.exercises as never };
}

/** Enrich SessionExercises with last-session comparison data.
 *  Match priority: exercise_id (exact) → name (case-insensitive).
 *  Only uses COMPLETED sessions. */
export async function enrichWithLastSession(
  exercises: SessionExercise[]
): Promise<SessionExercise[]> {
  const user = await getUser();
  if (!user) return exercises;

  // Fetch all completed sessions for this user (limit 50, enough for matching)
  const { data } = await supabase
    .from("workouts")
    .select("exercises")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data || data.length === 0) return exercises;

  // Flatten all past exercises into a map: exercise_id → latest sets, name → latest sets
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no errors from `lib/workoutSessions.ts`. (Ignore any pre-existing errors in other files.)

- [ ] **Step 3: Commit**

```bash
git add lib/workoutSessions.ts
git commit -m "feat: add workoutSessions lib with types and Supabase CRUD"
```

---

## Task 3: WorkoutExerciseRow Component

**Files:**
- Create: `components/WorkoutExerciseRow.tsx`

- [ ] **Step 1: Write the component**

```typescript
// components/WorkoutExerciseRow.tsx
"use client";
import { SessionExercise, SessionSet } from "@/lib/workoutSessions";

interface Props {
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetUpdate: (exIdx: number, setIdx: number, field: "reps" | "weight", value: number | null) => void;
  onSetToggle: (exIdx: number, setIdx: number) => void;
  onAddSet: (exIdx: number) => void;
}

export default function WorkoutExerciseRow({
  exercise,
  exerciseIndex,
  onSetUpdate,
  onSetToggle,
  onAddSet,
}: Props) {
  // Progressive overload: all completed sets beat corresponding last-session set
  const overloadAchieved = (() => {
    if (!exercise.lastSession || exercise.sets.filter((s) => s.done).length === 0) return false;
    const doneSets = exercise.sets.filter((s) => s.done);
    return doneSets.every((set, i) => {
      const last = exercise.lastSession!.sets[i];
      if (!last) return false;
      const weightBetter = set.weight !== null && last.weight !== null && set.weight >= last.weight;
      const repsBetter = set.reps !== null && last.reps !== null && set.reps >= last.reps;
      return weightBetter && repsBetter;
    });
  })();

  return (
    <div className="bg-surface rounded-2xl shadow-card overflow-hidden mb-3">
      {/* Exercise header */}
      <div
        className="px-4 py-3 flex items-center gap-2 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          {exerciseIndex + 1}
        </span>
        <p className="flex-1 text-dark font-semibold text-sm font-body">{exercise.name}</p>
        {exercise.note && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-body"
            style={{ background: "rgba(196,138,151,0.1)", color: "#C48A97" }}
          >
            {exercise.note}
          </span>
        )}
        {overloadAchieved && (
          <span
            className="text-xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: "rgba(52,211,153,0.12)", color: "#059669" }}
          >
            ↑ PR
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="w-6 text-center text-xs font-semibold text-dark/30 uppercase">#</span>
        <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">
          kg
        </span>
        <span className="w-3 text-center text-xs text-dark/20">×</span>
        <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">
          Reps
        </span>
        <span className="w-8" />
      </div>

      {/* Sets */}
      {exercise.sets.map((set, si) => {
        const lastSet = exercise.lastSession?.sets[si];
        return (
          <div key={si}>
            {/* Active set row */}
            <div className="flex items-center gap-2 px-4 py-1.5">
              <span className="w-6 text-center text-xs font-semibold text-dark/30">{si + 1}</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder={lastSet?.weight !== null ? String(lastSet?.weight ?? "") : "0"}
                value={set.weight !== null ? set.weight : ""}
                onChange={(e) =>
                  onSetUpdate(
                    exerciseIndex,
                    si,
                    "weight",
                    e.target.value === "" ? null : parseFloat(e.target.value)
                  )
                }
                className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body"
                style={set.done ? { opacity: 0.6 } : {}}
                min="0"
                step="0.5"
              />
              <span className="w-3 text-center text-xs text-dark/20">×</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={lastSet?.reps !== null ? String(lastSet?.reps ?? "") : "0"}
                value={set.reps !== null ? set.reps : ""}
                onChange={(e) =>
                  onSetUpdate(
                    exerciseIndex,
                    si,
                    "reps",
                    e.target.value === "" ? null : parseInt(e.target.value, 10)
                  )
                }
                className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body"
                style={set.done ? { opacity: 0.6 } : {}}
                min="1"
              />
              <button
                onClick={() => onSetToggle(exerciseIndex, si)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: set.done
                    ? "linear-gradient(135deg, #34D399, #10B981)"
                    : "var(--color-background)",
                  border: set.done ? "none" : "2px solid rgba(196,138,151,0.25)",
                }}
              >
                {set.done && <span className="text-white text-xs font-bold">✓</span>}
              </button>
            </div>

            {/* Last session ghost row */}
            {lastSet && (
              <div className="flex items-center gap-2 px-4 pb-1">
                <span className="w-6" />
                <button
                  className="flex-1 text-center text-xs font-body py-0.5 rounded-lg transition-colors"
                  style={{ color: "rgba(0,0,0,0.25)" }}
                  onClick={() => {
                    if (lastSet.weight !== null)
                      onSetUpdate(exerciseIndex, si, "weight", lastSet.weight);
                    if (lastSet.reps !== null)
                      onSetUpdate(exerciseIndex, si, "reps", lastSet.reps);
                  }}
                  title="Tap to pre-fill from last session"
                >
                  {lastSet.weight ?? "—"} kg
                </button>
                <span className="w-3" />
                <button
                  className="flex-1 text-center text-xs font-body py-0.5 rounded-lg transition-colors"
                  style={{ color: "rgba(0,0,0,0.25)" }}
                  onClick={() => {
                    if (lastSet.weight !== null)
                      onSetUpdate(exerciseIndex, si, "weight", lastSet.weight);
                    if (lastSet.reps !== null)
                      onSetUpdate(exerciseIndex, si, "reps", lastSet.reps);
                  }}
                  title="Tap to pre-fill from last session"
                >
                  {lastSet.reps ?? "—"} reps
                </button>
                <span className="w-8" />
              </div>
            )}
          </div>
        );
      })}

      {/* Add set */}
      <div className="px-4 pb-3 pt-1">
        <button
          onClick={() => onAddSet(exerciseIndex)}
          className="w-full py-2 rounded-xl text-xs font-semibold text-dark/40 border border-dashed transition-all active:scale-95"
          style={{ borderColor: "rgba(196,138,151,0.25)" }}
        >
          + Add set
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/WorkoutExerciseRow.tsx
git commit -m "feat: add WorkoutExerciseRow with last-session comparison"
```

---

## Task 4: Template List Page (Builder)

**Files:**
- Create: `app/training/builder/page.tsx`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "C:\Users\Wirra89\Downloads\herphase\app\training\builder"
```

- [ ] **Step 2: Write the file**

```typescript
// app/training/builder/page.tsx
"use client";
import PageSkeleton from "@/components/PageSkeleton";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  getTemplates,
  saveNewTemplate,
  deleteNewTemplate,
  type NewWorkoutTemplate,
} from "@/lib/workoutSessions";

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#F87171",
  follicular: "#34D399",
  ovulation: "#FBBF24",
  luteal: "#A78BFA",
};

export default function BuilderPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const [templates, setTemplates] = useState<NewWorkoutTemplate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getTemplates().then((data) => {
      setTemplates(data);
      setDataLoading(false);
    });
  }, [user]);

  async function handleCreate() {
    setCreating(true);
    const result = await saveNewTemplate({ name: "New Template", phase_tags: [], exercises: [] });
    setCreating(false);
    if (result.success && result.id) {
      router.push(`/training/builder/${result.id}`);
    }
  }

  async function handleDelete(id: number) {
    await deleteNewTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteId(null);
  }

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div
        className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)",
        }}
      />
      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-24">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest">
              Training
            </p>
            <h1 className="font-display text-2xl font-semibold text-dark">My Workouts</h1>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          >
            {creating ? "…" : "+ New"}
          </button>
        </header>

        {dataLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-2xl h-20 shadow-card animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-surface rounded-2xl p-8 shadow-card text-center">
            <p className="text-3xl mb-3">🏋️</p>
            <p className="text-dark font-semibold text-sm mb-1">No templates yet</p>
            <p className="text-dark/40 text-xs font-body mb-4">
              Create your first template to start tracking progressive overload
            </p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 shadow-soft"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
            >
              {creating ? "Creating…" : "Create first template"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="bg-surface rounded-2xl shadow-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-dark font-semibold text-sm truncate">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-dark/40 text-xs font-body">
                        {t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""}
                      </p>
                      {t.phase_tags.length > 0 && (
                        <div className="flex gap-1">
                          {t.phase_tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded-full font-semibold capitalize"
                              style={{
                                background: `${PHASE_COLORS[tag] ?? "#C48A97"}20`,
                                color: PHASE_COLORS[tag] ?? "#C48A97",
                              }}
                            >
                              {tag.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start session button */}
                  <button
                    onClick={() => router.push(`/training/session/${t.id}`)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 shadow-soft flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
                  >
                    Start →
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => router.push(`/training/builder/${t.id}`)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                    style={{ background: "rgba(196,138,151,0.1)", color: "#C48A97" }}
                  >
                    ✎
                  </button>

                  {/* Delete */}
                  {confirmDeleteId === t.id ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs font-bold text-rose-500 px-2 py-1 rounded-lg bg-rose-50 active:scale-95"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-bold text-dark/40 px-2 py-1 rounded-lg active:scale-95"
                        style={{ background: "var(--color-background)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(t.id)}
                      className="text-dark/20 hover:text-rose-400 transition-colors text-xl leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/training/builder/page.tsx
git commit -m "feat: add workout builder list page"
```

---

## Task 5: Template Editor Page

**Files:**
- Create: `app/training/builder/[id]/page.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "C:\Users\Wirra89\Downloads\herphase\app\training\builder\[id]"
```

- [ ] **Step 2: Write the file**

```typescript
// app/training/builder/[id]/page.tsx
"use client";
import PageSkeleton from "@/components/PageSkeleton";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import {
  getTemplate,
  saveNewTemplate,
  type NewWorkoutTemplate,
  type TemplateExercise,
} from "@/lib/workoutSessions";

const ALL_PHASES = ["menstrual", "follicular", "ovulation", "luteal"] as const;
const PHASE_COLORS: Record<string, string> = {
  menstrual: "#F87171",
  follicular: "#34D399",
  ovulation: "#FBBF24",
  luteal: "#A78BFA",
};

function newExercise(orderIndex: number): TemplateExercise {
  return { name: "", order_index: orderIndex, default_sets: 3, default_rep_range: "8-12" };
}

export default function BuilderEditorPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string, 10);

  const [template, setTemplate] = useState<NewWorkoutTemplate | null>(null);
  const [name, setName] = useState("");
  const [phaseTags, setPhaseTags] = useState<string[]>([]);
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dataLoading, setDataLoading] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !id) return;
    getTemplate(id).then((t) => {
      if (!t) { router.replace("/training/builder"); return; }
      setTemplate(t);
      setName(t.name);
      setPhaseTags(t.phase_tags);
      setExercises(
        t.exercises.length > 0 ? t.exercises : [newExercise(0)]
      );
      setDataLoading(false);
    });
  }, [user, id]);

  // Auto-save on changes with 1-second debounce
  function triggerAutoSave(
    newName: string,
    newTags: string[],
    newExercises: TemplateExercise[]
  ) {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const result = await saveNewTemplate({
        id,
        name: newName,
        phase_tags: newTags,
        exercises: newExercises.map((e, i) => ({ ...e, order_index: i })),
      });
      setSaveStatus(result.success ? "saved" : "error");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 800);
  }

  function updateName(v: string) {
    setName(v);
    triggerAutoSave(v, phaseTags, exercises);
  }

  function togglePhaseTag(phase: string) {
    const next = phaseTags.includes(phase)
      ? phaseTags.filter((p) => p !== phase)
      : [...phaseTags, phase];
    setPhaseTags(next);
    triggerAutoSave(name, next, exercises);
  }

  function updateExercise(idx: number, field: keyof TemplateExercise, value: string | number) {
    const next = exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e);
    setExercises(next);
    triggerAutoSave(name, phaseTags, next);
  }

  function addExercise() {
    const next = [...exercises, newExercise(exercises.length)];
    setExercises(next);
    triggerAutoSave(name, phaseTags, next);
  }

  function removeExercise(idx: number) {
    const next = exercises.filter((_, i) => i !== idx);
    setExercises(next.length > 0 ? next : [newExercise(0)]);
    triggerAutoSave(name, phaseTags, next.length > 0 ? next : [newExercise(0)]);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...exercises];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setExercises(next);
    triggerAutoSave(name, phaseTags, next);
  }

  function moveDown(idx: number) {
    if (idx === exercises.length - 1) return;
    const next = [...exercises];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setExercises(next);
    triggerAutoSave(name, phaseTags, next);
  }

  if (loading || !user || dataLoading) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div
        className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)",
        }}
      />
      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-24">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest">
              Edit Template
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2 py-1 rounded-lg"
            style={{
              color: saveStatus === "saved" ? "#059669" : saveStatus === "saving" ? "#C48A97" : saveStatus === "error" ? "#F87171" : "rgba(0,0,0,0.25)",
              background: saveStatus === "saved" ? "rgba(52,211,153,0.1)" : saveStatus === "saving" ? "rgba(196,138,151,0.08)" : "transparent",
            }}
          >
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : saveStatus === "error" ? "Error" : ""}
          </span>
        </header>

        {/* Template name */}
        <div className="bg-surface rounded-2xl shadow-card p-4 mb-4">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">
            Template name
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => updateName(e.target.value)}
            placeholder="e.g. Upper Body Strength"
            className="w-full bg-background rounded-xl px-3 py-3 text-base font-semibold text-dark outline-none placeholder:text-dark/20 font-body border border-transparent focus:border-primary/30 transition-colors"
          />
        </div>

        {/* Phase tags */}
        <div className="bg-surface rounded-2xl shadow-card p-4 mb-4">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">
            Best for phases (optional)
          </p>
          <div className="flex gap-2 flex-wrap">
            {ALL_PHASES.map((phase) => {
              const selected = phaseTags.includes(phase);
              return (
                <button
                  key={phase}
                  onClick={() => togglePhaseTag(phase)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all active:scale-95 border"
                  style={{
                    background: selected ? `${PHASE_COLORS[phase]}20` : "var(--color-background)",
                    color: selected ? PHASE_COLORS[phase] : "rgba(0,0,0,0.35)",
                    borderColor: selected ? PHASE_COLORS[phase] : "rgba(0,0,0,0.1)",
                  }}
                >
                  {phase}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exercises */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2.5 px-1">
            Exercises
          </p>
          <div className="space-y-2">
            {exercises.map((ex, idx) => (
              <div key={idx} className="bg-surface rounded-2xl shadow-card p-4">
                {/* Name + order controls */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={ex.name}
                    onChange={(e) => updateExercise(idx, "name", e.target.value)}
                    placeholder="Exercise name"
                    className="flex-1 text-dark font-semibold text-sm outline-none placeholder:text-dark/30 bg-transparent font-body"
                  />
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dark/25 hover:text-dark/60 transition-colors disabled:opacity-20"
                      style={{ background: "var(--color-background)" }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(idx)}
                      disabled={idx === exercises.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dark/25 hover:text-dark/60 transition-colors disabled:opacity-20"
                      style={{ background: "var(--color-background)" }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeExercise(idx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dark/20 hover:text-rose-400 transition-colors"
                      style={{ background: "var(--color-background)" }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Sets / reps / note */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-dark/40 font-semibold mb-1 uppercase tracking-wide">
                      Sets
                    </p>
                    <input
                      type="number"
                      value={ex.default_sets}
                      onChange={(e) =>
                        updateExercise(idx, "default_sets", parseInt(e.target.value, 10) || 1)
                      }
                      min="1"
                      max="10"
                      className="w-full bg-background rounded-xl px-2 py-2 text-center text-sm font-semibold text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark/40 font-semibold mb-1 uppercase tracking-wide">
                      Rep range
                    </p>
                    <input
                      type="text"
                      value={ex.default_rep_range}
                      onChange={(e) => updateExercise(idx, "default_rep_range", e.target.value)}
                      placeholder="8-12"
                      className="w-full bg-background rounded-xl px-2 py-2 text-center text-sm font-semibold text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-dark/40 font-semibold mb-1 uppercase tracking-wide">
                      Note
                    </p>
                    <input
                      type="text"
                      value={ex.note ?? ""}
                      onChange={(e) => updateExercise(idx, "note", e.target.value)}
                      placeholder="e.g. pause"
                      className="w-full bg-background rounded-xl px-2 py-2 text-center text-sm text-dark outline-none font-body placeholder:text-dark/20 border border-transparent focus:border-primary/30 transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add exercise */}
          <button
            onClick={addExercise}
            className="w-full mt-2 py-3 rounded-2xl text-sm font-semibold text-dark/40 border-2 border-dashed transition-all active:scale-95"
            style={{ borderColor: "rgba(196,138,151,0.25)" }}
          >
            + Add exercise
          </button>
        </div>

        {/* Start session CTA */}
        <button
          onClick={() => router.push(`/training/session/${id}`)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 shadow-soft mb-4"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          Start session with this template →
        </button>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add "app/training/builder/[id]/page.tsx"
git commit -m "feat: add workout template editor page"
```

---

## Task 6: Active Session Page (Template)

**Files:**
- Create: `app/training/session/[templateId]/page.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "C:\Users\Wirra89\Downloads\herphase\app\training\session\[templateId]"
```

- [ ] **Step 2: Write the file**

```typescript
// app/training/session/[templateId]/page.tsx
"use client";
import PageSkeleton from "@/components/PageSkeleton";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import {
  getTemplate,
  enrichWithLastSession,
  saveSession,
  type SessionExercise,
  type SessionSet,
} from "@/lib/workoutSessions";

function makeDefaultSets(count: number): SessionSet[] {
  return Array.from({ length: count }, () => ({ reps: null, weight: null, done: false }));
}

export default function SessionPage() {
  const { user, loading, cycleDay, cycleParams } = useApp();
  const router = useRouter();
  const params = useParams();
  const templateId = parseInt(params.templateId as string, 10);

  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [templateName, setTemplateName] = useState("Workout");
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const startedAt = useRef(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phaseData = getPhaseData(cycleDay, cycleParams);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !templateId) return;
    getTemplate(templateId).then(async (t) => {
      if (!t) { router.replace("/training/builder"); return; }
      setTemplateName(t.name);
      const rawExercises: SessionExercise[] = t.exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        note: ex.note,
        sets: makeDefaultSets(ex.default_sets),
      }));
      const enriched = await enrichWithLastSession(rawExercises);
      setExercises(enriched);
      setDataLoading(false);
    });
  }, [user, templateId]);

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function onSetUpdate(exIdx: number, setIdx: number, field: "reps" | "weight", value: number | null) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, [field]: value } : s)),
            }
      )
    );
  }

  function onSetToggle(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIdx ? { ...s, done: !s.done } : s
              ),
            }
      )
    );
  }

  function onAddSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              reps: lastSet?.reps ?? null,
              weight: lastSet?.weight ?? null,
              done: false,
            },
          ],
        };
      })
    );
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { name: "", sets: [{ reps: null, weight: null, done: false }] },
    ]);
  }

  async function finish(status: "completed" | "abandoned") {
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);
    await saveSession(
      { templateId, templateName, startedAt: startedAt.current, exercises },
      status,
      cycleDay,
      phaseData.phase
    );
    setSaving(false);
    router.replace("/training");
  }

  if (loading || !user || dataLoading) return <PageSkeleton />;

  const doneCount = exercises.flatMap((e) => e.sets).filter((s) => s.done).length;
  const totalCount = exercises.flatMap((e) => e.sets).length;

  return (
    <div className="min-h-dvh bg-background">
      <div
        className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)",
        }}
      />
      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3 mb-4">
          <button
            onClick={() => finish("abandoned")}
            className="w-9 h-9 rounded-xl bg-surface shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest">
              Active session
            </p>
            <h1 className="font-display text-lg font-semibold text-dark truncate">
              {templateName}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-dark/40 font-body">{formatElapsed(elapsed)}</p>
            <p className="text-xs font-semibold text-dark/60">
              {doneCount}/{totalCount} sets
            </p>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1.5 bg-background rounded-full mb-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%",
              background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
            }}
          />
        </div>

        {/* Exercise rows */}
        {exercises.map((ex, exIdx) => (
          <WorkoutExerciseRow
            key={exIdx}
            exercise={ex}
            exerciseIndex={exIdx}
            onSetUpdate={onSetUpdate}
            onSetToggle={onSetToggle}
            onAddSet={onAddSet}
          />
        ))}

        {/* Add exercise */}
        <button
          onClick={addExercise}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-dark/40 border-2 border-dashed transition-all active:scale-95 mb-4"
          style={{ borderColor: "rgba(196,138,151,0.25)" }}
        >
          + Add exercise
        </button>
      </main>

      {/* Sticky Finish button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-background to-transparent">
        <div className="mx-auto max-w-app">
          <button
            onClick={() => finish("completed")}
            disabled={saving}
            className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-50 shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          >
            {saving ? "Saving…" : "Finish Workout ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add "app/training/session/[templateId]/page.tsx"
git commit -m "feat: add active workout session page with last-session comparison"
```

---

## Task 7: Quick Workout Page

**Files:**
- Create: `app/training/session/quick/page.tsx`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "C:\Users\Wirra89\Downloads\herphase\app\training\session\quick"
```

- [ ] **Step 2: Write the file**

```typescript
// app/training/session/quick/page.tsx
"use client";
import PageSkeleton from "@/components/PageSkeleton";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import {
  enrichWithLastSession,
  saveSession,
  saveNewTemplate,
  type SessionExercise,
  type SessionSet,
} from "@/lib/workoutSessions";

function emptySet(): SessionSet {
  return { reps: null, weight: null, done: false };
}

export default function QuickWorkoutPage() {
  const { user, loading, cycleDay, cycleParams } = useApp();
  const router = useRouter();
  const phaseData = getPhaseData(cycleDay, cycleParams);

  const [exercises, setExercises] = useState<SessionExercise[]>([
    { name: "", sets: [emptySet()] },
  ]);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function formatElapsed(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function onSetUpdate(exIdx: number, setIdx: number, field: "reps" | "weight", value: number | null) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, [field]: value } : s)) }
      )
    );
  }

  function onSetToggle(exIdx: number, setIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.map((s, si) => (si === setIdx ? { ...s, done: !s.done } : s)) }
      )
    );
  }

  function onAddSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { reps: last?.reps ?? null, weight: last?.weight ?? null, done: false }] };
      })
    );
  }

  function addExercise() {
    setExercises((prev) => [...prev, { name: "", sets: [emptySet()] }]);
  }

  function updateExerciseName(idx: number, name: string) {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, name } : ex)));
  }

  async function handleFinish() {
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);
    await saveSession(
      { templateId: null, templateName: "Quick Workout", startedAt: startedAt.current, exercises },
      "completed",
      cycleDay,
      phaseData.phase
    );
    setSaving(false);
    setShowSaveModal(true);
  }

  async function handleSaveAsTemplate() {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    await saveNewTemplate({
      name: templateName.trim(),
      phase_tags: [],
      exercises: exercises.map((ex, i) => ({
        name: ex.name,
        order_index: i,
        default_sets: ex.sets.length,
        default_rep_range: "8-12",
        exercise_id: ex.exercise_id,
      })),
    });
    setSavingTemplate(false);
    router.replace("/training");
  }

  if (loading || !user) return <PageSkeleton />;

  const doneCount = exercises.flatMap((e) => e.sets).filter((s) => s.done).length;
  const totalCount = exercises.flatMap((e) => e.sets).length;

  return (
    <div className="min-h-dvh bg-background">
      <div
        className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)",
        }}
      />
      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest">
              Quick Workout
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-dark/40 font-body">{formatElapsed(elapsed)}</p>
            <p className="text-xs font-semibold text-dark/60">
              {doneCount}/{totalCount} sets
            </p>
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1.5 bg-background rounded-full mb-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%",
              background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
            }}
          />
        </div>

        {/* Exercise rows — with editable name header */}
        {exercises.map((ex, exIdx) => (
          <div key={exIdx}>
            {/* Editable name — overlaid on the WorkoutExerciseRow header */}
            <div className="bg-surface rounded-t-2xl px-4 pt-3 flex items-center gap-2 -mb-px shadow-card">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
              >
                {exIdx + 1}
              </span>
              <input
                type="text"
                value={ex.name}
                onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                placeholder="Exercise name"
                className="flex-1 text-dark font-semibold text-sm outline-none placeholder:text-dark/30 bg-transparent font-body py-1.5"
              />
            </div>
            <WorkoutExerciseRow
              exercise={ex}
              exerciseIndex={exIdx}
              onSetUpdate={onSetUpdate}
              onSetToggle={onSetToggle}
              onAddSet={onAddSet}
            />
          </div>
        ))}

        <button
          onClick={addExercise}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-dark/40 border-2 border-dashed transition-all active:scale-95 mb-4"
          style={{ borderColor: "rgba(196,138,151,0.25)" }}
        >
          + Add exercise
        </button>
      </main>

      {/* Sticky finish button */}
      {!showSaveModal && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-background to-transparent">
          <div className="mx-auto max-w-app">
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full py-4 rounded-2xl text-base font-semibold text-white transition-all active:scale-95 disabled:opacity-50 shadow-soft"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
            >
              {saving ? "Saving…" : "Finish Workout ✓"}
            </button>
          </div>
        </div>
      )}

      {/* Save-as-template modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
          <div
            className="w-full max-w-app rounded-t-3xl p-6 shadow-xl"
            style={{ background: "var(--color-surface)" }}
          >
            <p className="text-base font-semibold text-dark mb-1">Great session! 💪</p>
            <p className="text-xs text-dark/50 font-body mb-5">
              Save this as a template to track progress next time?
            </p>

            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name (e.g. Upper Push)"
              className="w-full bg-background rounded-xl px-3 py-3 text-sm font-body text-dark outline-none placeholder:text-dark/25 border border-transparent focus:border-primary/30 transition-colors mb-3"
            />

            <button
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || savingTemplate}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 shadow-soft mb-2"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
            >
              {savingTemplate ? "Saving…" : "Save as template"}
            </button>

            <button
              onClick={() => router.replace("/training")}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-dark/40 transition-all active:scale-95"
            >
              Keep as one-time session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add app/training/session/quick/page.tsx
git commit -m "feat: add quick workout session page with save-as-template"
```

---

## Task 8: Add My Workouts Section to Training Page

**Files:**
- Modify: `app/training/page.tsx`

The existing training page must not lose any functionality. This task is purely additive: insert a "My Workouts" section between the `TrainingIntelligenceCard` and the "Suggested + Library" pill row.

- [ ] **Step 1: Read current file lines 1-20 to confirm imports**

Read `app/training/page.tsx` lines 1-20. Confirm existing imports include `useRouter` and `useApp`.

- [ ] **Step 2: Add import for workoutSessions**

Find the line:
```typescript
import { TrainingIntelligenceCard } from "@/components/TrainingIntelligenceCard";
```

Add after it:
```typescript
import { getTemplates, type NewWorkoutTemplate } from "@/lib/workoutSessions";
```

- [ ] **Step 3: Add myTemplates state**

Find the line:
```typescript
  const [resolvedWorkoutType, setResolvedWorkoutType] = useState<WorkoutTypeId | null>(null);
```

Add after it:
```typescript
  const [myTemplates, setMyTemplates] = useState<NewWorkoutTemplate[]>([]);
```

- [ ] **Step 4: Load myTemplates in useEffect**

Find the existing useEffect that loads templates:
```typescript
  useEffect(() => {
    if (user) getWorkoutTemplates().then(setTemplates);
  }, [user]);
```

Add a new useEffect after it:
```typescript
  useEffect(() => {
    if (user) getTemplates().then((data) => setMyTemplates(data.slice(0, 3)));
  }, [user]);
```

- [ ] **Step 5: Insert My Workouts section into JSX**

Find this comment in the JSX (around line 599):
```typescript
        {/* ── TRAINING INTELLIGENCE CARD — collapsible, below phase card ── */}
        <TrainingIntelligenceCard
          onWorkoutTypeResolved={setResolvedWorkoutType}
          onUseWorkout={handleUseIntelligenceWorkout}
        />
```

Add the My Workouts section immediately after the `<TrainingIntelligenceCard ... />` closing tag:

```typescript
        {/* ── MY WORKOUTS section ── */}
        {myTemplates.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
                My Workouts
              </p>
              <button
                onClick={() => router.push("/training/builder")}
                className="text-xs font-semibold text-primary"
              >
                See all →
              </button>
            </div>
            <div className="space-y-2">
              {myTemplates.map((t) => (
                <div
                  key={t.id}
                  className="bg-surface rounded-2xl shadow-card px-4 py-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-dark font-semibold text-sm truncate">{t.name}</p>
                    <p className="text-dark/40 text-xs font-body">
                      {t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/training/session/${t.id}`)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
                  >
                    Start →
                  </button>
                </div>
              ))}
            </div>

            {/* Divider + Quick Workout */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
              <button
                onClick={() => router.push("/training/session/quick")}
                className="text-xs font-semibold text-dark/35 px-3 py-1.5 rounded-xl border transition-all active:scale-95"
                style={{ borderColor: "rgba(0,0,0,0.08)" }}
              >
                Quick Workout
              </button>
              <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            </div>
          </div>
        )}

        {/* ── My Workouts entry point when no templates yet ── */}
        {myTemplates.length === 0 && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => router.push("/training/builder")}
              className="flex-1 py-2.5 rounded-2xl text-xs font-semibold border transition-all active:scale-95"
              style={{ borderColor: "rgba(196,138,151,0.25)", color: "#C48A97" }}
            >
              + Build a template
            </button>
            <button
              onClick={() => router.push("/training/session/quick")}
              className="flex-1 py-2.5 rounded-2xl text-xs font-semibold border transition-all active:scale-95"
              style={{ borderColor: "rgba(0,0,0,0.08)", color: "rgba(0,0,0,0.35)" }}
            >
              Quick Workout
            </button>
          </div>
        )}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Final build check**

```bash
cd C:\Users\Wirra89\Downloads\herphase && npm run build
```

Expected: `✓ Compiled successfully` (existing VAPID push notification warning is a pre-existing issue and does not block the build).

- [ ] **Step 8: Commit**

```bash
git add app/training/page.tsx
git commit -m "feat: add My Workouts section and Quick Workout entry to training page"
```

---

## Self-Review Checklist

After completing all tasks:

- [ ] All routes are accessible: `/training/builder`, `/training/builder/[id]`, `/training/session/[id]`, `/training/session/quick`
- [ ] Template CRUD: create, edit (auto-save), delete with confirm
- [ ] Session: exercises loaded from template, last-session ghost rows visible, sets can be toggled done, finish saves with `status='completed'`
- [ ] Back button on session page saves with `status='abandoned'`
- [ ] Quick Workout: exercises added ad-hoc, finish shows save-as-template modal
- [ ] Progressive overload `↑ PR` chip appears when all done sets beat last session
- [ ] Phase tags stored and displayed on template cards
- [ ] TypeScript: `npx tsc --noEmit` passes
- [ ] Build: `npm run build` succeeds
