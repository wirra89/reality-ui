# Training Intelligence System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Training Intelligence System that scores workout types against cycle phase + daily readiness, selects phase-appropriate exercises, tracks exercise logs with volume, and surfaces progression targets — all integrated into the existing training page.

**Architecture:** A pure scoring engine (`trainingEngine.ts`) mirrors the existing `recipeEngine.ts` pattern — no DB calls, fully unit-testable — and takes a `TrainingEngineInput` to produce a ranked `TrainingRecommendation`. An exercise selector (`exerciseSelector.ts`) picks exercises from the existing 316-item library filtered by workout type + phase + equipment. A progression engine (`progressionEngine.ts`) reads prior phase logs to compute target sets/reps/weight with readiness multipliers. A new Supabase migration adds `workout_type` to `workouts` and creates `exercise_logs`. A `TrainingIntelligenceCard` component ties all engines together for display and saves structured logs on workout completion.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS (dark glass-morphism), Supabase (PostgreSQL + JSONB), Vitest unit tests, existing `lib/exercises.ts` (316 exercises), existing `context/AppContext.tsx`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/013_exercise_logs.sql` | Add `workout_type` col to `workouts`; create `exercise_logs` table |
| Create | `lib/trainingEngine.ts` | Pure scoring: workout type definitions + `scoreWorkoutTypes()` |
| Create | `lib/trainingEngine.test.ts` | Vitest unit tests for scoring engine |
| Create | `lib/exerciseSelector.ts` | `selectExercisesForWorkout()` — filter + sort exercises from library |
| Create | `lib/exerciseSelector.test.ts` | Vitest unit tests for selector |
| Create | `lib/trainingQueries.ts` | All DB calls for exercise_logs (no business logic) |
| Create | `lib/progressionEngine.ts` | Pure: readiness multiplier, progression targets, win detection |
| Create | `lib/progressionEngine.test.ts` | Vitest unit tests for progression engine |
| Create | `components/TrainingIntelligenceCard.tsx` | UI card: recommended workout, exercise list, progression targets |
| Modify | `lib/dailyPlan.ts` | Add `workoutType?: WorkoutTypeId` to `WorkoutRecommendation` |
| Modify | `lib/supabase.ts` | Add `ExerciseLog` type + `saveExerciseLog` / `getExerciseLogs*` |
| Modify | `app/training/page.tsx` | Integrate `TrainingIntelligenceCard`, pass workout_type to saveWorkout |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/013_exercise_logs.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/013_exercise_logs.sql
-- Adds workout_type to workouts and creates exercise_logs for volume tracking

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS workout_type TEXT;

CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id       BIGINT      REFERENCES public.workouts(id) ON DELETE SET NULL,
  exercise_name    TEXT        NOT NULL,
  exercise_id      TEXT        NOT NULL,
  workout_type     TEXT        NOT NULL,
  phase            TEXT        NOT NULL CHECK (phase IN ('menstrual','follicular','ovulation','luteal')),
  cycle_day        INTEGER     NOT NULL,
  performed_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  sets_data        JSONB       NOT NULL DEFAULT '[]',
  total_volume_kg  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_phase
  ON public.exercise_logs (user_id, phase);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_exercise
  ON public.exercise_logs (user_id, exercise_name, performed_at DESC);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_logs: own rows only"
  ON public.exercise_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Run using `mcp__claude_ai_Supabase__apply_migration` with project `nngkzdriribywaqnkbui`, migration name `013_exercise_logs`, and the SQL above.

Expected: migration applied without error.

- [ ] **Step 3: Verify the schema**

Run SQL: `SELECT column_name FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'workout_type';`

Expected: 1 row returned.

Run SQL: `SELECT column_name FROM information_schema.columns WHERE table_name = 'exercise_logs' ORDER BY ordinal_position;`

Expected: id, user_id, workout_id, exercise_name, exercise_id, workout_type, phase, cycle_day, performed_at, sets_data, total_volume_kg, created_at.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_exercise_logs.sql
git commit -m "feat: add exercise_logs table and workout_type column"
```

---

## Task 2: Training Engine (Pure Scoring)

**Files:**
- Create: `lib/trainingEngine.ts`
- Create: `lib/trainingEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/trainingEngine.test.ts`:

```typescript
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
    // The score for strength_lower should be lower when it was repeated
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run lib/trainingEngine.test.ts 2>&1 | head -20
```

Expected: FAIL with "Cannot find module './trainingEngine'"

- [ ] **Step 3: Implement `lib/trainingEngine.ts`**

```typescript
// lib/trainingEngine.ts
// Pure workout-type scoring engine for HerPhase training intelligence.
// No Supabase imports — all DB interaction lives in lib/trainingQueries.ts.
// Mirrors lib/recipeEngine.ts architecture for consistency.

import type { Phase } from "@/types/recipe";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkoutTypeId =
  | "strength_lower"
  | "strength_upper"
  | "strength_full"
  | "hypertrophy_lower"
  | "hypertrophy_upper"
  | "hiit_cardio"
  | "circuit_full"
  | "cardio_moderate"
  | "mobility_recovery"
  | "bodyweight_light"
  | "glute_focused"
  | "core_stability";

export type EquipmentLevel = "none" | "minimal" | "gym";
export type WorkoutIntensity = "recovery" | "light" | "moderate" | "high" | "peak";

export interface WorkoutTypeDef {
  id: WorkoutTypeId;
  name: string;
  phases: Phase[];                // best phases
  intensities: WorkoutIntensity[];
  durationMin: number;
  equipmentRequired: EquipmentLevel;
  description: string;
}

export interface TrainingEngineInput {
  phase: Phase;
  cycleDay: number;
  readinessScore: number;         // 0–100
  readinessLabel: "rest" | "moderate" | "good" | "peak";
  symptoms: string[];
  goal: string | null;
  energy: number | null;          // 1–5
  equipmentLevel: EquipmentLevel;
  availableMinutes: number;
  recentWorkoutTypes: WorkoutTypeId[]; // last 3 sessions
}

export interface ScoredWorkoutType {
  workoutTypeId: WorkoutTypeId;
  score: number;
  matchReasons: string[];
  estimatedDuration: number;
  intensity: WorkoutIntensity;
}

export interface TrainingRecommendation {
  primary: ScoredWorkoutType;
  fallback: ScoredWorkoutType;
  allScored: ScoredWorkoutType[];
}

// ── Workout type catalogue ────────────────────────────────────────────────────

export const WORKOUT_TYPES: Record<WorkoutTypeId, WorkoutTypeDef> = {
  strength_lower: {
    id: "strength_lower",
    name: "Lower Body Strength",
    phases: ["follicular", "ovulation"],
    intensities: ["high", "peak"],
    durationMin: 50,
    equipmentRequired: "gym",
    description: "Heavy compound lower body: squats, deadlifts, lunges",
  },
  strength_upper: {
    id: "strength_upper",
    name: "Upper Body Strength",
    phases: ["follicular", "ovulation"],
    intensities: ["high", "peak"],
    durationMin: 50,
    equipmentRequired: "gym",
    description: "Heavy compound upper body: bench, rows, overhead press",
  },
  strength_full: {
    id: "strength_full",
    name: "Full Body Strength",
    phases: ["follicular", "ovulation"],
    intensities: ["high", "peak"],
    durationMin: 60,
    equipmentRequired: "gym",
    description: "Full body compound movements with heavy loading",
  },
  hypertrophy_lower: {
    id: "hypertrophy_lower",
    name: "Lower Hypertrophy",
    phases: ["follicular", "ovulation", "luteal"],
    intensities: ["moderate", "high"],
    durationMin: 55,
    equipmentRequired: "gym",
    description: "Moderate weight, higher reps for lower body muscle growth",
  },
  hypertrophy_upper: {
    id: "hypertrophy_upper",
    name: "Upper Hypertrophy",
    phases: ["follicular", "ovulation", "luteal"],
    intensities: ["moderate", "high"],
    durationMin: 55,
    equipmentRequired: "gym",
    description: "Moderate weight, higher reps for upper body muscle growth",
  },
  hiit_cardio: {
    id: "hiit_cardio",
    name: "HIIT Cardio",
    phases: ["follicular", "ovulation"],
    intensities: ["high", "peak"],
    durationMin: 30,
    equipmentRequired: "minimal",
    description: "High-intensity intervals for max calorie burn and cardiovascular fitness",
  },
  circuit_full: {
    id: "circuit_full",
    name: "Full Body Circuit",
    phases: ["follicular", "ovulation", "luteal"],
    intensities: ["moderate", "high"],
    durationMin: 40,
    equipmentRequired: "minimal",
    description: "Timed circuits combining strength and cardio movements",
  },
  cardio_moderate: {
    id: "cardio_moderate",
    name: "Moderate Cardio",
    phases: ["follicular", "ovulation", "luteal", "menstrual"],
    intensities: ["light", "moderate"],
    durationMin: 35,
    equipmentRequired: "none",
    description: "Steady-state cardio at a comfortable, sustainable pace",
  },
  mobility_recovery: {
    id: "mobility_recovery",
    name: "Mobility & Recovery",
    phases: ["menstrual", "luteal", "follicular", "ovulation"],
    intensities: ["recovery", "light"],
    durationMin: 30,
    equipmentRequired: "none",
    description: "Stretching, foam rolling, yoga flows and joint mobility work",
  },
  bodyweight_light: {
    id: "bodyweight_light",
    name: "Light Bodyweight",
    phases: ["menstrual", "luteal"],
    intensities: ["light", "moderate"],
    durationMin: 30,
    equipmentRequired: "none",
    description: "Gentle bodyweight movements focusing on technique and activation",
  },
  glute_focused: {
    id: "glute_focused",
    name: "Glute Focus",
    phases: ["luteal", "follicular"],
    intensities: ["moderate", "high"],
    durationMin: 45,
    equipmentRequired: "minimal",
    description: "Hip thrusts, glute bridges, kickbacks and isolation work",
  },
  core_stability: {
    id: "core_stability",
    name: "Core & Stability",
    phases: ["menstrual", "luteal", "follicular", "ovulation"],
    intensities: ["light", "moderate"],
    durationMin: 25,
    equipmentRequired: "none",
    description: "Planks, dead bugs, pallof press and anti-rotation work",
  },
};

// ── Signal maps ───────────────────────────────────────────────────────────────

const SYMPTOM_ADJUSTMENTS: Record<string, Partial<Record<WorkoutTypeId, number>>> = {
  cramps:    { mobility_recovery: 15, bodyweight_light: 10, core_stability: 5, hiit_cardio: -15, strength_full: -10 },
  fatigue:   { mobility_recovery: 12, bodyweight_light: 8, cardio_moderate: 5, strength_full: -12, hiit_cardio: -12 },
  bloating:  { mobility_recovery: 10, core_stability: 8, hiit_cardio: -15, circuit_full: -8 },
  low_mood:  { cardio_moderate: 10, hiit_cardio: 8, bodyweight_light: 6 },
  headache:  { mobility_recovery: 15, bodyweight_light: 10, strength_full: -15, hiit_cardio: -15 },
};

const GOAL_TYPE_MAP: Record<string, WorkoutTypeId[]> = {
  fat_loss:     ["hiit_cardio", "circuit_full", "cardio_moderate"],
  recomp:       ["strength_lower", "strength_upper", "circuit_full"],
  muscle_gain:  ["strength_lower", "strength_upper", "strength_full", "hypertrophy_lower", "hypertrophy_upper"],
  maintenance:  ["circuit_full", "cardio_moderate", "bodyweight_light"],
  recovery:     ["mobility_recovery", "bodyweight_light", "core_stability"],
};

// ── Scoring helpers ───────────────────────────────────────────────────────────

function getReadinessIntensity(label: TrainingEngineInput["readinessLabel"]): WorkoutIntensity {
  switch (label) {
    case "rest":     return "recovery";
    case "moderate": return "light";
    case "good":     return "moderate";
    case "peak":     return "high";
  }
}

function countRepeatPenalty(typeId: WorkoutTypeId, recent: WorkoutTypeId[]): number {
  return recent.filter(t => t === typeId).length * 8;
}

// ── Core scoring ──────────────────────────────────────────────────────────────

function scoreOne(typeId: WorkoutTypeId, def: WorkoutTypeDef, input: TrainingEngineInput): ScoredWorkoutType {
  let score = 0;
  const matchReasons: string[] = [];
  const targetIntensity = getReadinessIntensity(input.readinessLabel);

  // Phase compatibility — +25 base if phase is listed
  if (def.phases.includes(input.phase)) {
    score += 25;
    // Phase bonus: +0 to +25 based on readiness
    const phaseBonus = Math.round((input.readinessScore / 100) * 25);
    score += phaseBonus;
    matchReasons.push(`Great for your ${input.phase} phase`);
  }

  // Readiness / intensity match — +20
  if (def.intensities.includes(targetIntensity)) {
    score += 20;
    matchReasons.push(`Matches your readiness today`);
  } else {
    // Partial credit if adjacent
    const order: WorkoutIntensity[] = ["recovery", "light", "moderate", "high", "peak"];
    const defMax = Math.max(...def.intensities.map(i => order.indexOf(i)));
    const targetIdx = order.indexOf(targetIntensity);
    if (Math.abs(defMax - targetIdx) === 1) score += 8;
  }

  // Equipment availability — hard exclude if requires more than user has
  const equipOrder: EquipmentLevel[] = ["none", "minimal", "gym"];
  if (equipOrder.indexOf(def.equipmentRequired) > equipOrder.indexOf(input.equipmentLevel)) {
    score -= 50; // effectively excludes it
  }

  // Time fit — +5
  if (def.durationMin <= input.availableMinutes) {
    score += 5;
    matchReasons.push(`Fits in ${def.durationMin} min`);
  }

  // Energy match — +10
  if (input.energy !== null) {
    if (input.energy <= 2 && (targetIntensity === "recovery" || targetIntensity === "light")) {
      if (def.intensities.includes(targetIntensity)) {
        score += 10;
        matchReasons.push("Easy on low energy");
      }
    } else if (input.energy >= 4 && (targetIntensity === "high" || targetIntensity === "peak")) {
      if (def.intensities.includes("high") || def.intensities.includes("peak")) {
        score += 10;
        matchReasons.push("Fuels your energy today");
      }
    }
  }

  // Goal match — +14 if type is in goal list
  if (input.goal) {
    const goalTypes = GOAL_TYPE_MAP[input.goal] ?? [];
    if (goalTypes.includes(typeId)) {
      score += 14;
      matchReasons.push(`Aligned with ${input.goal.replace(/_/g, " ")}`);
    }
  }

  // Symptom adjustments — ±15
  for (const symptom of input.symptoms) {
    const adjustments = SYMPTOM_ADJUSTMENTS[symptom] ?? {};
    const delta = adjustments[typeId] ?? 0;
    if (delta !== 0) score += delta;
    if (delta > 0 && !matchReasons.some(r => r.includes("symptom"))) {
      matchReasons.push("Supports your symptoms today");
    }
  }

  // Repetition penalty — −8 per recent repeat
  score -= countRepeatPenalty(typeId, input.recentWorkoutTypes);

  // Floor at 0
  score = Math.max(0, score);

  return {
    workoutTypeId: typeId,
    score,
    matchReasons: matchReasons.slice(0, 3),
    estimatedDuration: def.durationMin,
    intensity: def.intensities[def.intensities.length - 1],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function scoreWorkoutTypes(input: TrainingEngineInput): TrainingRecommendation {
  const allScored = (Object.keys(WORKOUT_TYPES) as WorkoutTypeId[])
    .map(id => scoreOne(id, WORKOUT_TYPES[id], input))
    .sort((a, b) => b.score - a.score);

  return {
    primary:   allScored[0],
    fallback:  allScored[1],
    allScored,
  };
}

export function buildTrainingInput(params: {
  phase: Phase;
  cycleDay: number;
  readinessScore: number;
  readinessLabel: TrainingEngineInput["readinessLabel"];
  symptoms?: string[];
  goal?: string | null;
  energy?: number | null;
  equipmentLevel?: EquipmentLevel;
  availableMinutes?: number;
  recentWorkoutTypes?: WorkoutTypeId[];
}): TrainingEngineInput {
  return {
    phase:               params.phase,
    cycleDay:            params.cycleDay,
    readinessScore:      params.readinessScore,
    readinessLabel:      params.readinessLabel,
    symptoms:            params.symptoms ?? [],
    goal:                params.goal ?? null,
    energy:              params.energy ?? null,
    equipmentLevel:      params.equipmentLevel ?? "gym",
    availableMinutes:    params.availableMinutes ?? 60,
    recentWorkoutTypes:  params.recentWorkoutTypes ?? [],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run lib/trainingEngine.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/trainingEngine.ts lib/trainingEngine.test.ts
git commit -m "feat: add training engine with workout type scoring"
```

---

## Task 3: Exercise Selector

**Files:**
- Create: `lib/exerciseSelector.ts`
- Create: `lib/exerciseSelector.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/exerciseSelector.test.ts`:

```typescript
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
    // core_stability with extremely restricted phase + equipment should still not throw
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run lib/exerciseSelector.test.ts 2>&1 | head -10
```

Expected: FAIL with "Cannot find module './exerciseSelector'"

- [ ] **Step 3: Implement `lib/exerciseSelector.ts`**

```typescript
// lib/exerciseSelector.ts
// Selects exercises from the library for a given workout type + phase.
// No DB calls. Reads the static exercises array from lib/exercises.ts.

import { exercises } from "./exercises";
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

// Equipment hierarchy: "none" < "minimal" < "gym"
const EQUIPMENT_TIERS: Record<EquipmentLevel, string[]> = {
  none:    ["bodyweight", "none", ""],
  minimal: ["bodyweight", "none", "", "resistance band", "dumbbell", "kettlebell"],
  gym:     [], // empty means include everything
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface ExerciseSelectorOptions {
  equipmentLevel?: EquipmentLevel;
  limit?: number;
  excludeIds?: string[];
}

/**
 * Returns exercises from the library filtered by workout type, phase, and equipment.
 * Sorted: phase-specific first, then "all", then by name.
 */
export function selectExercisesForWorkout(
  workoutTypeId: WorkoutTypeId,
  phase: Phase,
  options: ExerciseSelectorOptions = {},
): Exercise[] {
  const { equipmentLevel = "gym", limit = 6, excludeIds = [] } = options;
  const targetMuscles = WORKOUT_TYPE_MUSCLE_MAP[workoutTypeId] ?? [];
  const allowedEquipment = EQUIPMENT_TIERS[equipmentLevel];

  return exercises
    .filter(ex => {
      // Exclude explicitly excluded
      if (excludeIds.includes(ex.id)) return false;

      // Phase filter
      const phaseMatch = ex.phases.includes(phase) || ex.phases.includes("all");
      if (!phaseMatch) return false;

      // Muscle group filter
      const muscleMatch = targetMuscles.includes(ex.muscle);
      if (!muscleMatch) return false;

      // Equipment filter (only restrict when not "gym")
      if (equipmentLevel !== "gym" && allowedEquipment.length > 0) {
        const eq = (ex.equipment ?? "").toLowerCase();
        if (!allowedEquipment.includes(eq)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Phase-specific exercises first
      const aPhaseSpecific = a.phases.includes(phase) && !a.phases.includes("all");
      const bPhaseSpecific = b.phases.includes(phase) && !b.phases.includes("all");
      if (aPhaseSpecific && !bPhaseSpecific) return -1;
      if (!aPhaseSpecific && bPhaseSpecific) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run lib/exerciseSelector.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/exerciseSelector.ts lib/exerciseSelector.test.ts
git commit -m "feat: add exercise selector with workout-type and phase filtering"
```

---

## Task 4: Training Queries (DB Layer)

**Files:**
- Create: `lib/trainingQueries.ts`
- Modify: `lib/supabase.ts` — add `ExerciseLog` type + two new exported functions

- [ ] **Step 1: Add `ExerciseLog` type and DB functions to `lib/supabase.ts`**

Open `lib/supabase.ts` and add the following after the existing `PersonalRecord` type and before the end of the file:

```typescript
// ── Exercise Logs ─────────────────────────────────────────────────────────────

export interface ExerciseLog {
  id?: number;
  workout_id?: number | null;
  exercise_name: string;
  exercise_id: string;
  workout_type: string;
  phase: string;
  cycle_day: number;
  performed_at?: string; // ISO date string YYYY-MM-DD
  sets_data: Array<{ reps: number; weight: number }>;
  total_volume_kg: number;
}

export async function saveExerciseLog(log: ExerciseLog): Promise<void> {
  const user = await getUser();
  const { error } = await supabase
    .from("exercise_logs")
    .insert({
      user_id:         user.id,
      workout_id:      log.workout_id ?? null,
      exercise_name:   log.exercise_name,
      exercise_id:     log.exercise_id,
      workout_type:    log.workout_type,
      phase:           log.phase,
      cycle_day:       log.cycle_day,
      performed_at:    log.performed_at ?? new Date().toISOString().split("T")[0],
      sets_data:       log.sets_data,
      total_volume_kg: log.total_volume_kg,
    });
  if (error) throw error;
}

export async function getExerciseLogsForPhaseAndType(
  phase: string,
  workoutType: string,
  limitDays = 60,
): Promise<ExerciseLog[]> {
  const user = await getUser();
  const since = new Date();
  since.setDate(since.getDate() - limitDays);

  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("phase", phase)
    .eq("workout_type", workoutType)
    .gte("performed_at", since.toISOString().split("T")[0])
    .order("performed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ExerciseLog[];
}

export async function getExerciseHistory(
  exerciseName: string,
  phase: string,
  limitSessions = 10,
): Promise<ExerciseLog[]> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("exercise_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("exercise_name", exerciseName)
    .eq("phase", phase)
    .order("performed_at", { ascending: false })
    .limit(limitSessions);

  if (error) throw error;
  return (data ?? []) as ExerciseLog[];
}
```

- [ ] **Step 2: Create `lib/trainingQueries.ts` as a thin re-export wrapper**

```typescript
// lib/trainingQueries.ts
// Re-exports DB functions for exercise logs from lib/supabase.ts.
// Kept separate so components import from a single training-scoped module.

export {
  saveExerciseLog,
  getExerciseLogsForPhaseAndType,
  getExerciseHistory,
  type ExerciseLog,
} from "./supabase";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new types or functions.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts lib/trainingQueries.ts
git commit -m "feat: add exercise log DB types and query functions"
```

---

## Task 5: Progression Engine

**Files:**
- Create: `lib/progressionEngine.ts`
- Create: `lib/progressionEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/progressionEngine.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run lib/progressionEngine.test.ts 2>&1 | head -10
```

Expected: FAIL with "Cannot find module './progressionEngine'"

- [ ] **Step 3: Implement `lib/progressionEngine.ts`**

```typescript
// lib/progressionEngine.ts
// Pure progression logic: readiness multipliers, target calculation, win detection.
// No DB calls.

import type { ExerciseLog } from "./trainingQueries";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReadinessLabel = "rest" | "moderate" | "good" | "peak";

export type WinCondition =
  | "volume_pr"
  | "weight_pr"
  | "rep_pr"
  | "effort_match"
  | null;

export interface ProgressionTargets {
  targetSets:    number;
  targetReps:    number;
  targetWeight:  number;   // kg — 0 means bodyweight / pick own
  isFirstSession: boolean;
  suggestion:    string;
}

// ── Readiness multiplier ──────────────────────────────────────────────────────

const MULTIPLIERS: Record<ReadinessLabel, number> = {
  rest:     0.85,
  moderate: 0.97,
  good:     1.05,
  peak:     1.10,
};

export function getReadinessMultiplier(label: ReadinessLabel): number {
  return MULTIPLIERS[label];
}

// ── Progression targets ───────────────────────────────────────────────────────

function avgWeight(sets: Array<{ reps: number; weight: number }>): number {
  if (sets.length === 0) return 0;
  const total = sets.reduce((sum, s) => sum + s.weight, 0);
  return total / sets.length;
}

function avgReps(sets: Array<{ reps: number; weight: number }>): number {
  if (sets.length === 0) return 0;
  const total = sets.reduce((sum, s) => sum + s.reps, 0);
  return total / sets.length;
}

export function computeProgressionTargets(
  exerciseName: string,
  lastLog: ExerciseLog | null,
  readinessLabel: ReadinessLabel,
  phase: string,
): ProgressionTargets {
  if (!lastLog || lastLog.sets_data.length === 0) {
    return {
      targetSets:     3,
      targetReps:     8,
      targetWeight:   0,
      isFirstSession: true,
      suggestion:     `First session for ${exerciseName} — focus on form and feel out the weight.`,
    };
  }

  const multiplier  = getReadinessMultiplier(readinessLabel);
  const lastWeight  = avgWeight(lastLog.sets_data);
  const lastReps    = avgReps(lastLog.sets_data);
  const lastSets    = lastLog.sets_data.length;

  // Round target weight to nearest 1.25 kg plate increment
  const rawWeight = lastWeight * multiplier;
  const targetWeight = Math.round(rawWeight / 1.25) * 1.25;

  // Reps: stay same for rest/moderate, +1 for good, +1-2 for peak
  const repDelta = readinessLabel === "peak" ? 2 : readinessLabel === "good" ? 1 : 0;
  const targetReps = Math.max(1, Math.round(lastReps + repDelta));

  // Sets: deload on rest, maintain otherwise
  const targetSets = readinessLabel === "rest" ? Math.max(2, lastSets - 1) : lastSets;

  let suggestion: string;
  if (readinessLabel === "rest") {
    suggestion = `Deload day — reduce to ${targetSets}×${targetReps} @ ${targetWeight}kg and focus on technique.`;
  } else if (readinessLabel === "peak") {
    suggestion = `Strong readiness — push to ${targetSets}×${targetReps} @ ${targetWeight}kg.`;
  } else {
    suggestion = `Target ${targetSets}×${targetReps} @ ${targetWeight}kg based on last session.`;
  }

  return { targetSets, targetReps, targetWeight, isFirstSession: false, suggestion };
}

// ── Win condition detection ───────────────────────────────────────────────────

export function detectWinCondition(
  actualSets: Array<{ reps: number; weight: number }>,
  lastLog: ExerciseLog | null,
): WinCondition {
  if (!lastLog || lastLog.sets_data.length === 0) return null;

  const actualVolume = actualSets.reduce((s, set) => s + set.reps * set.weight, 0);
  const lastVolume   = lastLog.total_volume_kg > 0
    ? lastLog.total_volume_kg
    : lastLog.sets_data.reduce((s, set) => s + set.reps * set.weight, 0);

  const lastMaxWeight = Math.max(...lastLog.sets_data.map(s => s.weight));
  const actualMaxWeight = Math.max(...actualSets.map(s => s.weight));

  const lastMaxReps  = Math.max(...lastLog.sets_data.map(s => s.reps));
  const actualMaxReps = Math.max(...actualSets.map(s => s.reps));

  if (actualMaxWeight > lastMaxWeight)          return "weight_pr";
  if (actualVolume > lastVolume * 1.05)         return "volume_pr";
  if (actualMaxReps > lastMaxReps)              return "rep_pr";
  if (Math.abs(actualVolume - lastVolume) / lastVolume < 0.05) return "effort_match";

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run lib/progressionEngine.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run all tests to check for regressions**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run
```

Expected: all existing tests (recipeEngine) + new tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/progressionEngine.ts lib/progressionEngine.test.ts
git commit -m "feat: add progression engine with readiness multipliers and win detection"
```

---

## Task 6: TrainingIntelligenceCard Component

**Files:**
- Create: `components/TrainingIntelligenceCard.tsx`
- Modify: `lib/dailyPlan.ts` — add `workoutType?: WorkoutTypeId` to `WorkoutRecommendation`

- [ ] **Step 1: Add `workoutType` to `WorkoutRecommendation` in `lib/dailyPlan.ts`**

Read `lib/dailyPlan.ts` first, then find the `WorkoutRecommendation` interface and add the optional field:

```typescript
// BEFORE:
export interface WorkoutRecommendation {
  type: string;
  intensity: string;
  duration: number;
  reasoning: string;
  exercises?: string[];
}

// AFTER:
export interface WorkoutRecommendation {
  type: string;
  intensity: string;
  duration: number;
  reasoning: string;
  exercises?: string[];
  workoutType?: import("./trainingEngine").WorkoutTypeId;
}
```

- [ ] **Step 2: Create `components/TrainingIntelligenceCard.tsx`**

```typescript
"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { scoreWorkoutTypes, buildTrainingInput, WORKOUT_TYPES } from "@/lib/trainingEngine";
import type { WorkoutTypeId } from "@/lib/trainingEngine";
import { selectExercisesForWorkout } from "@/lib/exerciseSelector";
import { computeProgressionTargets, detectWinCondition } from "@/lib/progressionEngine";
import type { ReadinessLabel } from "@/lib/progressionEngine";
import { getExerciseHistory } from "@/lib/trainingQueries";
import type { ExerciseLog } from "@/lib/trainingQueries";
import type { Exercise } from "@/lib/exercises";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseWithTargets {
  exercise:    Exercise;
  lastLog:     ExerciseLog | null;
  targetSets:  number;
  targetReps:  number;
  targetWeight: number;
  isFirstSession: boolean;
  suggestion:  string;
}

interface Props {
  onWorkoutTypeResolved?: (workoutTypeId: WorkoutTypeId) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTENSITY_COLOR: Record<string, string> = {
  recovery: "bg-blue-500/30 text-blue-300",
  light:    "bg-green-500/30 text-green-300",
  moderate: "bg-yellow-500/30 text-yellow-300",
  high:     "bg-orange-500/30 text-orange-300",
  peak:     "bg-red-500/30 text-red-300",
};

const WIN_LABELS: Record<string, { label: string; color: string }> = {
  weight_pr:    { label: "Weight PR!", color: "text-yellow-300" },
  volume_pr:    { label: "Volume PR!", color: "text-purple-300" },
  rep_pr:       { label: "Rep PR!",    color: "text-green-300" },
  effort_match: { label: "Matched",   color: "text-blue-300" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TrainingIntelligenceCard({ onWorkoutTypeResolved }: Props) {
  const { todayState, cycleDay, cycleParams, profile } = useApp();
  const [exerciseRows, setExerciseRows] = useState<ExerciseWithTargets[]>([]);
  const [loading, setLoading] = useState(true);

  const phase = cycleParams?.currentPhase ?? "follicular";
  const readinessScore = todayState?.readinessScore ?? 60;
  const readinessLabel = (todayState?.readinessLabel ?? "moderate") as ReadinessLabel;

  const trainingInput = buildTrainingInput({
    phase,
    cycleDay: cycleDay ?? 1,
    readinessScore,
    readinessLabel,
    symptoms:   [],
    goal:       profile?.goal ?? null,
    energy:     null,
    equipmentLevel: "gym",
    availableMinutes: 60,
    recentWorkoutTypes: [],
  });

  const recommendation = scoreWorkoutTypes(trainingInput);
  const workoutTypeId  = recommendation.primary.workoutTypeId;
  const workoutDef     = WORKOUT_TYPES[workoutTypeId];

  useEffect(() => {
    onWorkoutTypeResolved?.(workoutTypeId);
  }, [workoutTypeId, onWorkoutTypeResolved]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const selected = selectExercisesForWorkout(workoutTypeId, phase, { limit: 5 });

      const rows = await Promise.all(
        selected.map(async (exercise): Promise<ExerciseWithTargets> => {
          let lastLog: ExerciseLog | null = null;
          try {
            const history = await getExerciseHistory(exercise.name, phase, 1);
            lastLog = history[0] ?? null;
          } catch {
            // unauthenticated or no data — ignore
          }
          const targets = computeProgressionTargets(exercise.name, lastLog, readinessLabel, phase);
          return { exercise, lastLog, ...targets };
        })
      );

      if (!cancelled) {
        setExerciseRows(rows);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [workoutTypeId, phase, readinessLabel]);

  const primaryIntensity = recommendation.primary.intensity;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Today&apos;s Workout</p>
          <h3 className="text-lg font-semibold text-white">{workoutDef.name}</h3>
          <p className="text-sm text-white/60 mt-0.5">{workoutDef.description}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${INTENSITY_COLOR[primaryIntensity] ?? "bg-white/10 text-white/60"}`}>
          {primaryIntensity}
        </span>
      </div>

      {/* Match reasons */}
      {recommendation.primary.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recommendation.primary.matchReasons.map(r => (
            <span key={r} className="text-xs bg-white/8 border border-white/10 text-white/70 px-2.5 py-0.5 rounded-full">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">Exercises</p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : exerciseRows.length === 0 ? (
          <p className="text-sm text-white/40 italic">No matching exercises for this phase.</p>
        ) : (
          exerciseRows.map(({ exercise, targetSets, targetReps, targetWeight, isFirstSession, lastLog }) => {
            const winKey = lastLog ? detectWinCondition(lastLog.sets_data, lastLog) : null;
            const win = winKey ? WIN_LABELS[winKey] : null;

            return (
              <div key={exercise.id} className="rounded-xl bg-white/5 border border-white/8 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-sm truncate">{exercise.name}</p>
                    {win && (
                      <span className={`text-xs font-semibold ${win.color}`}>{win.label}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 capitalize">
                    {exercise.muscle} · {exercise.equipment || "bodyweight"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">
                    {targetSets}×{targetReps}
                    {targetWeight > 0 ? ` · ${targetWeight}kg` : ""}
                  </p>
                  {isFirstSession && (
                    <p className="text-xs text-white/40">First session</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fallback suggestion */}
      {recommendation.fallback && (
        <div className="pt-1 border-t border-white/8">
          <p className="text-xs text-white/40">
            Alternative: <span className="text-white/60">{WORKOUT_TYPES[recommendation.fallback.workoutTypeId].name}</span>
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new type errors.

- [ ] **Step 4: Commit**

```bash
git add components/TrainingIntelligenceCard.tsx lib/dailyPlan.ts
git commit -m "feat: add TrainingIntelligenceCard component with phase-aware exercise selection"
```

---

## Task 7: Integration — Wire Into Training Page

**Files:**
- Modify: `app/training/page.tsx`

- [ ] **Step 1: Read the current training page**

Read `app/training/page.tsx` to understand the existing structure before making changes.

- [ ] **Step 2: Add `TrainingIntelligenceCard` import and state to `app/training/page.tsx`**

At the top of the file, add the import after existing component imports:

```typescript
import { TrainingIntelligenceCard } from "@/components/TrainingIntelligenceCard";
import type { WorkoutTypeId } from "@/lib/trainingEngine";
```

Inside the page component, add state to capture the resolved workout type:

```typescript
const [resolvedWorkoutType, setResolvedWorkoutType] = useState<WorkoutTypeId | null>(null);
```

- [ ] **Step 3: Render `TrainingIntelligenceCard` at the top of the page content**

Find the section where the page renders its main content (after loading/skeleton guards) and add the card before the existing manual workout builder. Typical location — before the exercise builder div:

```tsx
{/* Training Intelligence */}
<TrainingIntelligenceCard onWorkoutTypeResolved={setResolvedWorkoutType} />
```

- [ ] **Step 4: Pass `workout_type` when saving workouts**

Find the `saveWorkout` call in the training page. Update it to include `workout_type`:

```typescript
// BEFORE:
await saveWorkout({
  name: workoutName,
  cycle_day: cycleDay ?? 1,
  phase: cycleParams?.currentPhase ?? "follicular",
  exercises: exerciseRows.map(...),
});

// AFTER:
await saveWorkout({
  name: workoutName,
  cycle_day: cycleDay ?? 1,
  phase: cycleParams?.currentPhase ?? "follicular",
  workout_type: resolvedWorkoutType ?? undefined,
  exercises: exerciseRows.map(...),
});
```

Note: The `Workout` interface in `lib/supabase.ts` needs `workout_type?: string` added if not already present. Add it:

```typescript
export interface Workout {
  id?: number;
  name: string;
  cycle_day: number;
  phase: string;
  workout_type?: string;   // ← add this line
  exercises: WorkoutExercise[];
}
```

Also update the `saveWorkout` function body to include `workout_type` in the insert:

```typescript
export async function saveWorkout(workout: Workout): Promise<number> {
  const user = await getUser();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id:      user.id,
      name:         workout.name,
      cycle_day:    workout.cycle_day,
      phase:        workout.phase,
      workout_type: workout.workout_type ?? null,  // ← add this line
      exercises:    workout.exercises,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
```

- [ ] **Step 5: Verify TypeScript compiles and tests still pass**

```bash
cd C:/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | head -30
cd C:/Users/Wirra89/Downloads/herphase && npx vitest run
```

Expected: no type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/training/page.tsx lib/supabase.ts
git commit -m "feat: integrate TrainingIntelligenceCard into training page"
```

---

## Post-Implementation: Deploy to Vercel

After all 7 tasks are complete and tests pass:

```bash
cd C:/Users/Wirra89/Downloads/herphase && vercel --prod
```

Expected: successful deployment to `https://herphase-eta.vercel.app`
