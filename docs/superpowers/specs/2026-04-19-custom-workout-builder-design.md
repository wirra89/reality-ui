# Custom Workout Builder — Design Spec

**Date:** 2026-04-19
**Status:** Approved

---

## Goal

Let users build, save, and reuse structured workout templates with per-exercise set/rep targets, last-session comparison during active sessions, and progressive overload prompting. A secondary Quick Workout path supports ad-hoc sessions that can optionally be saved as templates afterward.

---

## Routes

| Route | Purpose |
|---|---|
| `/training` | Existing launcher — gains "My Workouts" section and Quick Workout entry |
| `/training/builder` | Template list + new template creation |
| `/training/builder/[id]` | Edit a specific template (name, exercises, order, defaults) |
| `/training/session/[templateId]` | Active workout session from a template |
| `/training/session/quick` | Ad-hoc session with no template pre-loaded |

---

## Data Model

### `workout_templates` table (existing — extend JSON)

```sql
-- No schema change needed; extend the existing `exercises` JSON column
-- Each element in the exercises array:
{
  "exercise_id": "string (optional — links to exercises library)",
  "name": "string",
  "order_index": "number",
  "default_sets": "number",
  "default_rep_range": "string (e.g. '8-12')",
  "note": "string (optional)"
}
```

### `workouts` table (existing — add two columns)

```sql
ALTER TABLE workouts
  ADD COLUMN template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'abandoned'));
```

Existing rows can stay with `status = 'completed'` (safe default).

### Session exercise object (in-memory + persisted to `workouts.exercises`)

```typescript
interface SessionExercise {
  exercise_id?: string;   // optional — matches template if present
  name: string;
  sets: Array<{ reps: number | null; weight: number | null; done: boolean }>;
}
```

---

## TypeScript Types

```typescript
// lib/workoutSessions.ts

export interface TemplateExercise {
  exercise_id?: string;
  name: string;
  order_index: number;
  default_sets: number;
  default_rep_range: string; // "8-12"
  note?: string;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  name: string;
  phase_tags?: string[];   // e.g. ["follicular","ovulation"]
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
  sets: SessionSet[];
  // populated at session start from last completed session matching this exercise
  lastSession?: { sets: Array<{ reps: number | null; weight: number | null }> };
}

export interface ActiveSession {
  templateId: string | null; // null for Quick Workout
  templateName: string;
  startedAt: string;
  exercises: SessionExercise[];
}
```

---

## Key Functions (lib/workoutSessions.ts)

### `getLastSessionForTemplate(templateId: string): Promise<WorkoutLog | null>`

- Queries `workouts` WHERE `template_id = templateId AND status = 'completed'` ORDER BY `logged_at DESC` LIMIT 1
- Returns full session record or null

### `getLastSessionExerciseData(exercises: SessionExercise[]): Promise<SessionExercise[]>`

For each exercise in the upcoming session, looks up the most recent completed set data:
1. Match by `exercise_id` if present → finds latest `workouts` row containing that exercise_id
2. Fallback: match by `name` (case-insensitive) across all completed sessions
3. Attaches `lastSession.sets` to each matched exercise

### `saveSession(session: ActiveSession, status: 'completed' | 'abandoned'): Promise<void>`

- Inserts into `workouts` with `template_id`, `status`, `exercises` JSON, `logged_at = now()`

### `getTemplates(): Promise<WorkoutTemplate[]>`

- Queries `workout_templates` for the current user, ORDER BY `updated_at DESC`

### `saveTemplate(template: Omit<WorkoutTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<WorkoutTemplate>`

- Upserts to `workout_templates`

### `deleteTemplate(id: string): Promise<void>`

---

## Components

### `components/WorkoutExerciseRow.tsx`

Props:
```typescript
{
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetUpdate: (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => void;
  onSetToggle: (exIdx: number, setIdx: number) => void;
  onAddSet: (exIdx: number) => void;
}
```

Renders:
- Exercise name + note chip
- One row per set: weight input → × → reps input → done toggle
- "Last session" ghost row beneath each set showing prior reps/weight (dimmed, tappable to pre-fill)
- Progressive overload prompt: if all sets beat last session → green "↑ Great session!" chip

---

## UX Details

### Training tab (`/training`) changes

- "My Workouts" section added between phase recommendation and exercise library
- Lists up to 3 recent templates with "→" to start session; "See all" → `/training/builder`
- "Quick Workout" appears below a divider, smaller card, no promotional copy

### Builder (`/training/builder`)

- Full-page list of all templates
- Tap template → edit (`/training/builder/[id]`)
- FAB "New Template"

### Builder edit (`/training/builder/[id]`)

- Template name input at top
- Draggable exercise list (react-beautiful-dnd or simple up/down arrows)
- Each exercise row: name (typeahead from exercise library), default_sets, default_rep_range, note
- Add from library or free-text
- "Delete template" at bottom (confirm modal)
- Auto-save on blur / explicit Save button

### Active Session (`/training/session/[templateId]`)

- Header: template name + elapsed timer
- `WorkoutExerciseRow` per exercise
- Last-session comparison shown inline (ghost row per set)
- "Finish Workout" → saves with `status='completed'`, navigates back
- Swipe-to-abandon or back button → saves with `status='abandoned'` (no last-session data use)

### Quick Workout (`/training/session/quick`)

- Identical session UX but no template pre-loaded
- User adds exercises ad-hoc
- On finish: modal "Save as template?" with name input → if yes, creates template from session exercises; if no → saves as one-time log (template_id = null)

---

## Phase Awareness

Templates can carry `phase_tags` (array of phase strings). The `/training` launcher surfaces phase-matched templates at the top of "My Workouts" based on current cycle phase. No hard gate — all templates remain accessible.

---

## Scope Boundaries (MVP)

**In scope:**
- Create / edit / delete templates
- Active session with last-session comparison
- Progressive overload indicator (per-exercise)
- Quick Workout with optional save-as-template
- Phase tags on templates (stored + surfaced in launcher)

**Out of scope (explicit YAGNI):**
- Sharing or duplicating templates between users
- Rest timer / built-in stopwatch
- RPE / perceived effort logging
- Volume analytics / weekly charts
- Superset grouping
- Video demos

---

## Migration

```sql
-- Run once on Supabase
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'abandoned'));
```

Existing rows: `status` defaults to `'completed'` — safe and correct.

---

## Files to Create / Modify

| File | Action |
|---|---|
| `lib/workoutSessions.ts` | Create — all Supabase CRUD + type definitions |
| `components/WorkoutExerciseRow.tsx` | Create — reusable set-logging row with comparison |
| `app/training/page.tsx` | Modify — add My Workouts section + Quick Workout entry |
| `app/training/builder/page.tsx` | Create — template list |
| `app/training/builder/[id]/page.tsx` | Create — template editor |
| `app/training/session/[templateId]/page.tsx` | Create — template-based session |
| `app/training/session/quick/page.tsx` | Create — ad-hoc session |
| `supabase/migrations/YYYYMMDD_workout_builder.sql` | Create — ALTER TABLE migration |
