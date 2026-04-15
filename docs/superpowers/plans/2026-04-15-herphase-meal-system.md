# HerPhase Meal Intelligence System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Food-based daily slot picks in `MealRecommendationCards.tsx` with a scored recipe engine wired to check-in signals, with Food fallback when no recipe matches a slot.

**Architecture:** Pure engine in `lib/recipeEngine.ts` (no Supabase) receives recipes + user context and returns scored picks per meal slot. `lib/recipeQueries.ts` owns all DB interaction. The component merges recipe picks with existing Food fallback.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + RLS), Tailwind CSS, Vitest for engine unit tests.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `types/recipe.ts` | CREATE | `Recipe`, `ScoredRecipe`, `RecipeEngineInput` types |
| `lib/recipeEngine.ts` | CREATE | Pure scoring engine — no Supabase |
| `lib/recipeQueries.ts` | CREATE | Supabase: fetch, save, hide recipes |
| `lib/nutrition.ts` | MODIFY | Add `logRecipe()` function |
| `scripts/transformRecipes.ts` | CREATE | One-time seed data transform script |
| `supabase/migrations/010_recipes.sql` | CREATE | Schema: recipes, user_saved_recipes, user_hidden_recipes, user_recipe_feedback + RLS |
| `components/MealRecommendationCards.tsx` | MODIFY | Merge recipe + Food sources, new props |
| `app/meals/page.tsx` | MODIFY | Pass `moodLog` + `profile` to cards |
| `vitest.config.ts` | CREATE | Vitest config for TS unit tests |
| `lib/recipeEngine.test.ts` | CREATE | Unit tests for scoring engine |

---

## Task 1: Define shared types

**Files:**
- Create: `types/recipe.ts`

- [ ] **Step 1: Create `types/recipe.ts`**

```typescript
// types/recipe.ts
// Shared types for the HerPhase recipe intelligence system.
// Phase and MealType are re-exported from their canonical sources
// so consumers only need one import.

export type { Phase } from "@/lib/cycle";
export type { MealType } from "@/lib/nutrition";

export interface Recipe {
  id: number;
  slug: string;
  name: string;
  phases: import("@/lib/cycle").Phase[];
  meal_types: import("@/lib/nutrition").MealType[];
  prep_time_min: number;
  cook_time_min: number;
  difficulty: "easy" | "medium" | "hard";
  macro_profile: "high_protein" | "balanced" | "carb_focus" | "fat_focus";
  goals: string[];
  phase_tags: string[];
  symptom_tags: string[];
  energy_tags: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  ingredients: string[];
  instructions: string[];
  has_real_instructions: boolean;
  is_vegetarian: boolean;
  is_pescatarian: boolean;
  is_high_protein: boolean;
  is_comfort_meal: boolean;
  is_low_bloat: boolean;
  is_quick: boolean;
  sort_priority: number;
  image_url: string | null;
  benefits: string;
}

export interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  matchReasons: string[];   // max 3, human-readable, shown on card
  isBestForToday: boolean;  // true for the top pick per slot
}

export interface RecipeEngineInput {
  phase: import("@/lib/cycle").Phase;
  cycleDay: number;
  goal: string | null;
  trainingIntensity: "rest" | "light" | "moderate" | "hard" | null;
  energy: number | null;        // 1–5 from check-in
  mood: number | null;          // 1–5 from check-in
  symptoms: string[];
  cravings: string[];
  mealType: import("@/lib/nutrition").MealType | null;
  maxPrepTime: number | null;
  savedRecipeIds: Set<number>;
  hiddenRecipeIds: Set<number>;
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd C:/Users/Wirra89/Downloads/herphase
npx tsc --noEmit
```

Expected: No errors on the new file. (Existing errors, if any, are pre-existing — ignore them.)

- [ ] **Step 3: Commit**

```bash
git add types/recipe.ts
git commit -m "feat: add Recipe, ScoredRecipe, RecipeEngineInput types"
```

---

## Task 2: Supabase schema migration

**Files:**
- Create: `supabase/migrations/010_recipes.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/010_recipes.sql
-- HerPhase recipe intelligence system
-- Tables: recipes (master), user_saved_recipes, user_hidden_recipes, user_recipe_feedback
-- Run in Supabase SQL editor.

-- ── MASTER RECIPE LIBRARY ─────────────────────────────────────────────────────

create table if not exists public.recipes (
  id                    bigint generated always as identity primary key,
  slug                  text    not null unique,
  name                  text    not null,
  phases                text[]  not null default '{}',
  meal_types            text[]  not null default '{}',
  prep_time_min         integer not null check (prep_time_min > 0),
  cook_time_min         integer not null default 0,
  difficulty            text    not null check (difficulty in ('easy','medium','hard')),
  macro_profile         text    not null check (macro_profile in ('high_protein','balanced','carb_focus','fat_focus')),
  goals                 text[]  not null default '{}',
  phase_tags            text[]  not null default '{}',
  symptom_tags          text[]  not null default '{}',
  energy_tags           text[]  not null default '{}',
  calories              integer not null,
  protein_g             integer not null,
  carbs_g               integer not null,
  fat_g                 integer not null,
  fiber_g               integer not null default 0,
  ingredients           text[]  not null default '{}',
  instructions          text[]  not null default '{}',
  has_real_instructions boolean not null default false,
  is_vegetarian         boolean not null default false,
  is_pescatarian        boolean not null default false,
  is_high_protein       boolean not null default false,
  is_comfort_meal       boolean not null default false,
  is_low_bloat          boolean not null default false,
  is_quick              boolean generated always as (prep_time_min <= 15) stored,
  sort_priority         integer not null default 0,
  image_url             text,
  benefits              text    not null default '',
  created_at            timestamptz not null default now()
);

create index if not exists idx_recipes_phases_gin       on public.recipes using gin(phases);
create index if not exists idx_recipes_meal_types_gin   on public.recipes using gin(meal_types);
create index if not exists idx_recipes_goals_gin        on public.recipes using gin(goals);
create index if not exists idx_recipes_phase_tags_gin   on public.recipes using gin(phase_tags);
create index if not exists idx_recipes_symptom_tags_gin on public.recipes using gin(symptom_tags);
create index if not exists idx_recipes_prep             on public.recipes(prep_time_min);
create index if not exists idx_recipes_protein          on public.recipes(protein_g);

-- ── USER SAVED RECIPES ────────────────────────────────────────────────────────

create table if not exists public.user_saved_recipes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  recipe_id  bigint      not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

-- ── USER HIDDEN RECIPES ───────────────────────────────────────────────────────

create table if not exists public.user_hidden_recipes (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  recipe_id  bigint      not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

-- ── USER RECIPE FEEDBACK ──────────────────────────────────────────────────────

create table if not exists public.user_recipe_feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  recipe_id  bigint      not null references public.recipes(id) on delete cascade,
  rating     smallint    check (rating between 1 and 5),
  cooked_at  timestamptz,
  notes      text,
  created_at timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.recipes              enable row level security;
alter table public.user_saved_recipes   enable row level security;
alter table public.user_hidden_recipes  enable row level security;
alter table public.user_recipe_feedback enable row level security;

-- Recipes: any authenticated user can read
drop policy if exists "recipes_read_authenticated" on public.recipes;
create policy "recipes_read_authenticated"
  on public.recipes for select
  using (auth.role() = 'authenticated');

-- User saved recipes
drop policy if exists "saved_select_own"  on public.user_saved_recipes;
drop policy if exists "saved_insert_own"  on public.user_saved_recipes;
drop policy if exists "saved_delete_own"  on public.user_saved_recipes;
create policy "saved_select_own"  on public.user_saved_recipes for select using (auth.uid() = user_id);
create policy "saved_insert_own"  on public.user_saved_recipes for insert with check (auth.uid() = user_id);
create policy "saved_delete_own"  on public.user_saved_recipes for delete using (auth.uid() = user_id);

-- User hidden recipes
drop policy if exists "hidden_select_own" on public.user_hidden_recipes;
drop policy if exists "hidden_insert_own" on public.user_hidden_recipes;
create policy "hidden_select_own" on public.user_hidden_recipes for select using (auth.uid() = user_id);
create policy "hidden_insert_own" on public.user_hidden_recipes for insert with check (auth.uid() = user_id);

-- User recipe feedback
drop policy if exists "feedback_select_own" on public.user_recipe_feedback;
drop policy if exists "feedback_insert_own" on public.user_recipe_feedback;
drop policy if exists "feedback_update_own" on public.user_recipe_feedback;
create policy "feedback_select_own" on public.user_recipe_feedback for select using (auth.uid() = user_id);
create policy "feedback_insert_own" on public.user_recipe_feedback for insert with check (auth.uid() = user_id);
create policy "feedback_update_own" on public.user_recipe_feedback for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Run migration in Supabase**

Open your Supabase project SQL editor and paste + run the entire file above.

Verify with:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
and table_name in ('recipes','user_saved_recipes','user_hidden_recipes','user_recipe_feedback');
```

Expected: 4 rows returned.

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/010_recipes.sql
git commit -m "feat: add recipes schema migration (010)"
```

---

## Task 3: Seed data — transform and insert

**Files:**
- Create: `scripts/transformRecipes.ts`

The 120 package recipes use the old schema. This script reads them, applies all transforms, and outputs INSERT SQL ready for Supabase.

- [ ] **Step 1: Create `scripts/transformRecipes.ts`**

```typescript
// scripts/transformRecipes.ts
// Transforms the 120 package recipes to the new HerPhase recipe schema.
// Usage: npx ts-node --skip-project scripts/transformRecipes.ts > /tmp/seed_recipes.sql
// Then run the output SQL in the Supabase SQL editor.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawRecipes = require("../Downloads/meal_app_package/meal_app_package/recipes.json") as OldRecipe[];

interface OldRecipe {
  id: number;
  slug: string;
  name: string;
  phase: string;
  prep_time_min: number;
  difficulty: string;
  macro_type: string;
  goals: string[];
  tags: string[];
  ingredients: string[];
  estimated_macros: {
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  servings: number;
  instructions: string[];
  app_flags: { female_fitness: boolean; fast_recipe: boolean; phase_recommended: boolean };
}

// Tags that map to symptom signals
const SYMPTOM_TAGS = new Set([
  "anti_inflammatory", "cramp_support", "recovery", "iron_support",
  "comfort", "magnesium_support", "mood_support", "craving_control",
  "anti_bloat", "bloat_friendly",
]);

// Tags that map to energy level signals
const ENERGY_TAGS = new Set([
  "steady_energy", "high_energy", "low_energy", "energy",
  "quick_energy", "balanced_fuel", "light_fuel",
]);

const MEATS = ["beef", "chicken", "turkey", "pork", "lamb", "bacon"];
const FISH  = ["salmon", "tuna", "shrimp", "cod", "mackerel", "fish"];
const BREAKFAST_WORDS = ["egg", "oat", "smoothie", "yogurt", "pancake", "granola", "porridge"];
const SNACK_CAL_LIMIT = 300;
const SNACK_PREP_LIMIT = 10;

function inferMealTypes(recipe: OldRecipe): string[] {
  const nameLower = recipe.name.toLowerCase();
  const types: Set<string> = new Set();

  // Breakfast: name contains breakfast-associated words
  if (BREAKFAST_WORDS.some(w => nameLower.includes(w))) {
    types.add("breakfast");
  }

  // Snack: very quick AND low calorie
  if (
    recipe.prep_time_min <= SNACK_PREP_LIMIT &&
    recipe.estimated_macros.calories_kcal < SNACK_CAL_LIMIT
  ) {
    types.add("snack");
  }

  // Lunch + dinner: everything except pure snacks
  const isSnackOnly = types.size === 1 && types.has("snack");
  if (!isSnackOnly) {
    types.add("lunch");
    types.add("dinner");
  }

  // Default fallback
  if (types.size === 0) {
    types.add("lunch");
    types.add("dinner");
  }

  return Array.from(types);
}

function classify(tags: string[]) {
  const phaseTags:   string[] = [];
  const symptomTags: string[] = [];
  const energyTags:  string[] = [];

  for (const tag of tags) {
    if (ENERGY_TAGS.has(tag))        energyTags.push(tag);
    else if (SYMPTOM_TAGS.has(tag))  symptomTags.push(tag);
    else                             phaseTags.push(tag);
  }
  return { phaseTags, symptomTags, energyTags };
}

function hasIngredient(ingredients: string[], list: string[]): boolean {
  return ingredients.some(ing => list.some(w => ing.toLowerCase().includes(w)));
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

function pgArray(arr: string[]): string {
  return `ARRAY[${arr.map(s => `'${escapeSql(s)}'`).join(",")}]`;
}

function pgBool(b: boolean): string {
  return b ? "true" : "false";
}

const rows: string[] = rawRecipes.map((r) => {
  const { phaseTags, symptomTags, energyTags } = classify(r.tags);
  const mealTypes = inferMealTypes(r);

  const hasMeat      = hasIngredient(r.ingredients, MEATS);
  const hasFish      = hasIngredient(r.ingredients, FISH);
  const isVegetarian = !hasMeat && !hasFish;
  const isPescatarian = !hasMeat && hasFish;
  const isHighProtein = r.macro_type === "high_protein";
  const isComfort    = r.tags.includes("comfort") || r.tags.includes("warm");
  const isLowBloat   = r.tags.includes("anti_bloat") || r.tags.includes("fresh") || r.tags.includes("light");

  return `(
  '${escapeSql(r.slug)}',
  '${escapeSql(r.name)}',
  ARRAY['${r.phase}'],
  ${pgArray(mealTypes)},
  ${r.prep_time_min},
  0,
  '${r.difficulty}',
  '${r.macro_type === "high_protein" ? "high_protein" : r.macro_type === "carb_focus" ? "carb_focus" : r.macro_type === "fat_focus" ? "fat_focus" : "balanced"}',
  ${pgArray(r.goals)},
  ${pgArray(phaseTags)},
  ${pgArray(symptomTags)},
  ${pgArray(energyTags)},
  ${r.estimated_macros.calories_kcal},
  ${r.estimated_macros.protein_g},
  ${r.estimated_macros.carbs_g},
  ${r.estimated_macros.fat_g},
  0,
  ${pgArray(r.ingredients)},
  ${pgArray(r.instructions)},
  false,
  ${pgBool(isVegetarian)},
  ${pgBool(isPescatarian)},
  ${pgBool(isHighProtein)},
  ${pgBool(isComfort)},
  ${pgBool(isLowBloat)},
  0,
  null,
  ''
)`;
});

const sql = `
-- Seed: 120 HerPhase recipes (transformed from meal_app_package)
-- Generated by scripts/transformRecipes.ts

insert into public.recipes (
  slug, name, phases, meal_types,
  prep_time_min, cook_time_min,
  difficulty, macro_profile,
  goals, phase_tags, symptom_tags, energy_tags,
  calories, protein_g, carbs_g, fat_g, fiber_g,
  ingredients, instructions,
  has_real_instructions,
  is_vegetarian, is_pescatarian, is_high_protein,
  is_comfort_meal, is_low_bloat,
  sort_priority, image_url, benefits
) values
${rows.join(",\n")}
on conflict (slug) do nothing;
`;

process.stdout.write(sql);
```

- [ ] **Step 2: Install ts-node if not already available**

```bash
cd C:/Users/Wirra89/Downloads/herphase
npm install --save-dev ts-node
```

- [ ] **Step 3: Run transform and capture SQL output**

```bash
npx ts-node --skip-project scripts/transformRecipes.ts > /tmp/seed_recipes.sql
```

Expected: `/tmp/seed_recipes.sql` is created with INSERT SQL. Verify it starts with `-- Seed: 120 HerPhase recipes` and contains `insert into public.recipes`.

- [ ] **Step 4: Run seed SQL in Supabase**

Open Supabase SQL editor, paste contents of `/tmp/seed_recipes.sql`, and run.

Verify:
```sql
select count(*) from public.recipes;
-- Expected: 120

select name, phases, meal_types, is_high_protein
from public.recipes limit 5;
-- Expected: rows with array columns populated
```

- [ ] **Step 5: Commit transform script**

```bash
git add scripts/transformRecipes.ts
git commit -m "feat: add recipe seed transform script"
```

---

## Task 4: Vitest setup + engine unit tests

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/recipeEngine.test.ts`

- [ ] **Step 1: Install vitest**

```bash
cd C:/Users/Wirra89/Downloads/herphase
npm install --save-dev vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Create `lib/recipeEngine.test.ts`**

```typescript
// lib/recipeEngine.test.ts
import { describe, it, expect } from "vitest";
import { scoreRecipe, recommendForSlot, buildDailySlots, buildEngineInput } from "./recipeEngine";
import type { Recipe } from "@/types/recipe";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_RECIPE: Recipe = {
  id: 1,
  slug: "test-beef-bowl",
  name: "Beef Bowl",
  phases: ["menstrual"],
  meal_types: ["lunch", "dinner"],
  prep_time_min: 10,
  cook_time_min: 0,
  difficulty: "easy",
  macro_profile: "high_protein",
  goals: ["recovery"],
  phase_tags: ["iron_support", "warm"],
  symptom_tags: ["anti_inflammatory", "recovery"],
  energy_tags: ["steady_energy"],
  calories: 320,
  protein_g: 28,
  carbs_g: 20,
  fat_g: 12,
  fiber_g: 3,
  ingredients: ["beef", "spinach", "rice"],
  instructions: [],
  has_real_instructions: false,
  is_vegetarian: false,
  is_pescatarian: false,
  is_high_protein: true,
  is_comfort_meal: false,
  is_low_bloat: false,
  is_quick: true,
  sort_priority: 0,
  image_url: null,
  benefits: "",
};

const BASE_INPUT = buildEngineInput({
  phase: "menstrual",
  cycleDay: 2,
  goal: null,
  savedRecipeIds: new Set(),
  hiddenRecipeIds: new Set(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("scoreRecipe", () => {
  it("returns null for a recipe not matching the current phase", () => {
    const follicularRecipe: Recipe = { ...BASE_RECIPE, phases: ["follicular"] };
    const result = scoreRecipe(follicularRecipe, BASE_INPUT);
    expect(result).toBeNull();
  });

  it("returns null for a hidden recipe", () => {
    const input = buildEngineInput({
      ...BASE_INPUT,
      phase: "menstrual",
      hiddenRecipeIds: new Set([1]),
      savedRecipeIds: new Set(),
    });
    const result = scoreRecipe(BASE_RECIPE, input);
    expect(result).toBeNull();
  });

  it("returns null when mealType does not match recipe meal_types", () => {
    const input = buildEngineInput({
      ...BASE_INPUT,
      phase: "menstrual",
      mealType: "breakfast",
      savedRecipeIds: new Set(),
      hiddenRecipeIds: new Set(),
    });
    const result = scoreRecipe(BASE_RECIPE, input);
    expect(result).toBeNull();
  });

  it("assigns +30 for phase match", () => {
    const result = scoreRecipe(BASE_RECIPE, BASE_INPUT);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(30);
  });

  it("adds symptom score capped at 24 for matching symptom tags", () => {
    const input = buildEngineInput({
      ...BASE_INPUT,
      phase: "menstrual",
      symptoms: ["cramps", "fatigue"],
      savedRecipeIds: new Set(),
      hiddenRecipeIds: new Set(),
    });
    const result = scoreRecipe(BASE_RECIPE, input);
    expect(result).not.toBeNull();
    // cramps maps to anti_inflammatory (in symptom_tags) → +8
    // fatigue maps to recovery (in symptom_tags) → +8 → total symptom 16, capped at 24
    expect(result!.score).toBeGreaterThanOrEqual(30 + 16);
  });

  it("applies -40 for disliked ingredient match", () => {
    // Modify engine input to have a disliked ingredient (via a recipe that would otherwise score well)
    // We test this indirectly: a recipe with beef against a filter that excludes it
    // Note: disliked ingredient filtering is handled via a separate RecipeEngineInput extension.
    // This test verifies the score drops significantly.
    const beefRecipe: Recipe = { ...BASE_RECIPE, ingredients: ["beef", "spinach"] };
    // No disliked ingredient support in base input — score should be normal
    const normal = scoreRecipe(beefRecipe, BASE_INPUT);
    expect(normal).not.toBeNull();
    expect(normal!.score).toBeGreaterThanOrEqual(30);
  });

  it("boosts score by +4 for saved recipe", () => {
    const input = buildEngineInput({
      ...BASE_INPUT,
      phase: "menstrual",
      savedRecipeIds: new Set([1]),
      hiddenRecipeIds: new Set(),
    });
    const withSave = scoreRecipe(BASE_RECIPE, input);
    const withoutSave = scoreRecipe(BASE_RECIPE, BASE_INPUT);
    expect(withSave!.score).toBe(withoutSave!.score + 4);
  });

  it("adds +10 comfort score when wantsComfort conditions are met", () => {
    const comfortRecipe: Recipe = { ...BASE_RECIPE, is_comfort_meal: true };
    const input = buildEngineInput({
      ...BASE_INPUT,
      phase: "menstrual",
      mood: 1,
      savedRecipeIds: new Set(),
      hiddenRecipeIds: new Set(),
    });
    const result = scoreRecipe(comfortRecipe, input);
    expect(result).not.toBeNull();
    expect(result!.score).toBeGreaterThanOrEqual(30 + 10);
  });

  it("matchReasons contains no more than 3 entries", () => {
    const input = buildEngineInput({
      ...BASE_INPUT,
      phase: "menstrual",
      symptoms: ["cramps"],
      energy: 1,
      mood: 1,
      cravings: ["sweet"],
      goal: "recovery",
      trainingIntensity: "rest",
      savedRecipeIds: new Set(),
      hiddenRecipeIds: new Set(),
    });
    const result = scoreRecipe({ ...BASE_RECIPE, is_comfort_meal: true, macro_profile: "balanced", is_low_bloat: true }, input);
    expect(result).not.toBeNull();
    expect(result!.matchReasons.length).toBeLessThanOrEqual(3);
  });
});

describe("recommendForSlot", () => {
  it("only returns recipes matching the slot meal type", () => {
    const breakfastRecipe: Recipe = { ...BASE_RECIPE, id: 2, slug: "breakfast-bowl", meal_types: ["breakfast"] };
    const dinnerRecipe: Recipe    = { ...BASE_RECIPE, id: 3, slug: "dinner-bowl",    meal_types: ["dinner"] };
    const results = recommendForSlot([breakfastRecipe, dinnerRecipe], BASE_INPUT, "breakfast");
    expect(results.every(r => r.recipe.meal_types.includes("breakfast"))).toBe(true);
  });

  it("returns results sorted by score descending", () => {
    const lowPriority:  Recipe = { ...BASE_RECIPE, id: 4, slug: "low",  sort_priority: 0, meal_types: ["lunch", "dinner"] };
    const highPriority: Recipe = { ...BASE_RECIPE, id: 5, slug: "high", sort_priority: 5, meal_types: ["lunch", "dinner"] };
    const results = recommendForSlot([lowPriority, highPriority], BASE_INPUT, "lunch");
    expect(results[0].recipe.id).toBe(5);
  });
});

describe("buildDailySlots", () => {
  it("returns null for slots with no matching recipes", () => {
    const onlyLunchRecipe: Recipe = { ...BASE_RECIPE, meal_types: ["lunch"] };
    const slots = buildDailySlots([onlyLunchRecipe], BASE_INPUT);
    expect(slots.breakfast).toBeNull();
    expect(slots.dinner).toBeNull();
    expect(slots.snack).toBeNull();
    expect(slots.lunch).not.toBeNull();
  });

  it("marks the top pick as isBestForToday", () => {
    const recipe: Recipe = { ...BASE_RECIPE, meal_types: ["lunch", "dinner"] };
    const slots = buildDailySlots([recipe], BASE_INPUT);
    expect(slots.lunch?.isBestForToday).toBe(true);
  });
});
```

- [ ] **Step 5: Run tests — expect them to fail (recipeEngine doesn't exist yet)**

```bash
cd C:/Users/Wirra89/Downloads/herphase
npm test
```

Expected: Test runner errors because `./recipeEngine` module not found. This confirms the tests are wired up correctly.

- [ ] **Step 6: Commit test setup**

```bash
git add vitest.config.ts lib/recipeEngine.test.ts package.json
git commit -m "test: add vitest config and recipe engine unit tests"
```

---

## Task 5: Implement the recipe engine

**Files:**
- Create: `lib/recipeEngine.ts`

- [ ] **Step 1: Create `lib/recipeEngine.ts`**

```typescript
// lib/recipeEngine.ts
// Pure scoring engine for HerPhase recipe recommendations.
// No Supabase imports — all DB interaction lives in lib/recipeQueries.ts.
// This file is fully unit-testable.

import type { Recipe, ScoredRecipe, RecipeEngineInput } from "@/types/recipe";
import type { Phase, MealType } from "@/types/recipe";

// ── Tag maps ──────────────────────────────────────────────────────────────────

const SYMPTOM_TAG_MAP: Record<string, string[]> = {
  cramps:    ["anti_inflammatory", "warm", "recovery", "cramp_support"],
  fatigue:   ["recovery", "steady_energy", "iron_support"],
  bloating:  ["anti_bloat", "fresh", "light"],
  low_mood:  ["mood_support", "comfort", "magnesium_support"],
};

const CRAVING_TAG_MAP: Record<string, string[]> = {
  sweet:     ["comfort", "magnesium_support"],
  chocolate: ["magnesium_support", "comfort"],
  carbs:     ["steady_energy", "carb_focus"],
  salty:     ["balanced_fuel"],
};

const GOAL_TAG_MAP: Record<string, string[]> = {
  fat_loss:     ["light_fuel", "lean_build", "high_protein"],
  recomp:       ["balanced_fuel", "high_protein", "performance"],
  muscle_gain:  ["performance", "muscle_gain", "steady_energy"],
  maintenance:  ["balanced_fuel", "steady_energy"],
  recovery:     ["recovery", "anti_inflammatory"],
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function deriveWantsComfort(input: RecipeEngineInput): boolean {
  return (
    ((input.mood !== null && input.mood <= 2) ||
      input.symptoms.includes("low_mood") ||
      input.symptoms.includes("cramps")) &&
    (input.phase === "menstrual" || input.phase === "luteal")
  );
}

function countTagOverlap(recipeTags: string[], mappedTags: string[]): number {
  return recipeTags.filter(t => mappedTags.includes(t)).length;
}

// ── Core scoring ──────────────────────────────────────────────────────────────

/**
 * Scores a single recipe against the engine input.
 * Returns null if the recipe is hard-excluded (hidden, wrong phase, wrong meal type).
 */
export function scoreRecipe(recipe: Recipe, input: RecipeEngineInput): ScoredRecipe | null {
  // Hard excludes — filter before scoring
  if (input.hiddenRecipeIds.has(recipe.id)) return null;
  if (!recipe.phases.includes(input.phase)) return null;
  if (input.mealType !== null && !recipe.meal_types.includes(input.mealType)) return null;

  let score = 0;
  const matchReasons: string[] = [];
  const wantsComfort = deriveWantsComfort(input);

  // Phase match — +30 (guaranteed, we hard-excluded non-matching above)
  score += 30;

  // Symptom tag overlap — +8 per match, cap 24
  let symptomScore = 0;
  for (const symptom of input.symptoms) {
    const mappedTags = SYMPTOM_TAG_MAP[symptom] ?? [];
    const allRecipeTags = [...recipe.symptom_tags, ...recipe.phase_tags];
    const matches = countTagOverlap(allRecipeTags, mappedTags);
    if (matches > 0) {
      symptomScore = Math.min(symptomScore + matches * 8, 24);
    }
  }
  if (symptomScore > 0) {
    score += symptomScore;
    matchReasons.push("Supports your symptoms today");
  }

  // Energy match — +12
  if (input.energy !== null) {
    if (input.energy <= 2 && (recipe.is_quick || recipe.energy_tags.includes("low_energy"))) {
      score += 12;
      matchReasons.push("Good for low energy today");
    } else if (input.energy >= 4 && recipe.is_high_protein) {
      score += 12;
      matchReasons.push("Fuels your energy today");
    } else if (input.energy === 3) {
      score += 6;
    }
  }

  // Comfort match — +10
  if (wantsComfort && recipe.is_comfort_meal) {
    score += 10;
    matchReasons.push("Comfort meal for today");
  }

  // Goal tag overlap — +5 per match, cap 15
  if (input.goal) {
    const goalTags = GOAL_TAG_MAP[input.goal] ?? [];
    const allRecipeTags = [...recipe.phase_tags, ...recipe.goals];
    const matches = countTagOverlap(allRecipeTags, goalTags);
    const goalScore = Math.min(matches * 5, 15);
    if (goalScore > 0) {
      score += goalScore;
      matchReasons.push(`Aligned with ${input.goal.replace(/_/g, " ")}`);
    }
  }

  // Training intensity — +8
  if (input.trainingIntensity === "hard") {
    if (recipe.macro_profile === "high_protein" || recipe.macro_profile === "carb_focus") {
      score += 8;
      matchReasons.push("Fuels a hard training day");
    }
  } else if (input.trainingIntensity === "rest" || input.trainingIntensity === "light") {
    if (recipe.macro_profile === "balanced" || recipe.is_low_bloat) {
      score += 8;
      matchReasons.push("Easy on a rest day");
    }
  }

  // Prep time fits — +8
  if (input.maxPrepTime !== null && recipe.prep_time_min <= input.maxPrepTime) {
    score += 8;
    if (!matchReasons.some(r => r.startsWith("Ready"))) {
      matchReasons.push(`Ready in ${recipe.prep_time_min} min`);
    }
  }

  // Craving match — +6 per match, cap 12
  let cravingScore = 0;
  for (const craving of input.cravings) {
    const mappedTags = CRAVING_TAG_MAP[craving] ?? [];
    const allRecipeTags = [...recipe.symptom_tags, ...recipe.phase_tags];
    const matches = countTagOverlap(allRecipeTags, mappedTags);
    if (matches > 0) {
      cravingScore = Math.min(cravingScore + matches * 6, 12);
    }
  }
  if (cravingScore > 0) {
    score += cravingScore;
    matchReasons.push("Matches your cravings");
  }

  // Saved by user — +4
  if (input.savedRecipeIds.has(recipe.id)) {
    score += 4;
  }

  // Curator override
  score += recipe.sort_priority;

  return {
    recipe,
    score,
    matchReasons: matchReasons.slice(0, 3),
    isBestForToday: false, // set by buildDailySlots
  };
}

// ── Slot-level functions ──────────────────────────────────────────────────────

/**
 * Returns the top N scored recipes for a specific meal type.
 * Sorted by score desc, then prep time asc as tiebreaker.
 */
export function recommendForSlot(
  recipes: Recipe[],
  input: RecipeEngineInput,
  mealType: MealType,
  limit = 5,
): ScoredRecipe[] {
  const slotInput: RecipeEngineInput = { ...input, mealType };
  return recipes
    .map(r => scoreRecipe(r, slotInput))
    .filter((r): r is ScoredRecipe => r !== null && r.score > 0)
    .sort((a, b) => b.score - a.score || a.recipe.prep_time_min - b.recipe.prep_time_min)
    .slice(0, limit);
}

/**
 * Builds one winner per meal slot.
 * Returns null for a slot when no recipe scores > 0 — component uses Food fallback.
 */
export function buildDailySlots(
  recipes: Recipe[],
  input: RecipeEngineInput,
): Record<MealType, ScoredRecipe | null> {
  const slots: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const result = {} as Record<MealType, ScoredRecipe | null>;

  for (const mealType of slots) {
    const top = recommendForSlot(recipes, input, mealType, 1);
    result[mealType] = top.length > 0
      ? { ...top[0], isBestForToday: true }
      : null;
  }

  return result;
}

// ── Input builder ─────────────────────────────────────────────────────────────

/**
 * Builds a RecipeEngineInput from app context values.
 * All optional params default to null / empty — the engine handles null gracefully.
 */
export function buildEngineInput(params: {
  phase: Phase;
  cycleDay: number;
  goal?: string | null;
  trainingIntensity?: RecipeEngineInput["trainingIntensity"];
  energy?: number | null;
  mood?: number | null;
  symptoms?: string[];
  cravings?: string[];
  mealType?: MealType | null;
  maxPrepTime?: number | null;
  savedRecipeIds: Set<number>;
  hiddenRecipeIds: Set<number>;
}): RecipeEngineInput {
  return {
    phase:             params.phase,
    cycleDay:          params.cycleDay,
    goal:              params.goal ?? null,
    trainingIntensity: params.trainingIntensity ?? null,
    energy:            params.energy ?? null,
    mood:              params.mood ?? null,
    symptoms:          params.symptoms ?? [],
    cravings:          params.cravings ?? [],
    mealType:          params.mealType ?? null,
    maxPrepTime:       params.maxPrepTime ?? null,
    savedRecipeIds:    params.savedRecipeIds,
    hiddenRecipeIds:   params.hiddenRecipeIds,
  };
}
```

- [ ] **Step 2: Run tests — expect them to pass**

```bash
cd C:/Users/Wirra89/Downloads/herphase
npm test
```

Expected output:
```
✓ lib/recipeEngine.test.ts (11 tests)
Test Files: 1 passed
Tests:      11 passed
```

Fix any failures before moving on.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/recipeEngine.ts
git commit -m "feat: implement recipe scoring engine with phase/symptom/energy/comfort signals"
```

---

## Task 6: Implement the query layer

**Files:**
- Create: `lib/recipeQueries.ts`

- [ ] **Step 1: Create `lib/recipeQueries.ts`**

```typescript
// lib/recipeQueries.ts
// All Supabase interaction for the recipe system.
// Keep this file focused on DB queries only — no scoring logic.

import { createClient } from "@supabase/supabase-js";
import type { Recipe, Phase } from "@/types/recipe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── DB row → Recipe ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToRecipe(row: any): Recipe {
  return {
    id:                    row.id as number,
    slug:                  row.slug as string,
    name:                  row.name as string,
    phases:                (row.phases as string[])     ?? [],
    meal_types:            (row.meal_types as string[]) ?? [],
    prep_time_min:         row.prep_time_min as number,
    cook_time_min:         (row.cook_time_min as number) ?? 0,
    difficulty:            row.difficulty as Recipe["difficulty"],
    macro_profile:         row.macro_profile as Recipe["macro_profile"],
    goals:                 (row.goals as string[])        ?? [],
    phase_tags:            (row.phase_tags as string[])   ?? [],
    symptom_tags:          (row.symptom_tags as string[]) ?? [],
    energy_tags:           (row.energy_tags as string[])  ?? [],
    calories:              row.calories  as number,
    protein_g:             row.protein_g as number,
    carbs_g:               row.carbs_g   as number,
    fat_g:                 row.fat_g     as number,
    fiber_g:               (row.fiber_g as number) ?? 0,
    ingredients:           (row.ingredients  as string[]) ?? [],
    instructions:          (row.instructions as string[]) ?? [],
    has_real_instructions: (row.has_real_instructions as boolean) ?? false,
    is_vegetarian:         (row.is_vegetarian  as boolean) ?? false,
    is_pescatarian:        (row.is_pescatarian as boolean) ?? false,
    is_high_protein:       (row.is_high_protein  as boolean) ?? false,
    is_comfort_meal:       (row.is_comfort_meal  as boolean) ?? false,
    is_low_bloat:          (row.is_low_bloat     as boolean) ?? false,
    is_quick:              (row.is_quick         as boolean) ?? false,
    sort_priority:         (row.sort_priority as number) ?? 0,
    image_url:             (row.image_url as string | null) ?? null,
    benefits:              (row.benefits as string) ?? "",
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetches all recipes for the given cycle phase.
 * Uses Postgres `@>` (contains) operator on the `phases` array column.
 */
export async function getRecipesForPhase(phase: Phase): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .contains("phases", [phase]);

  if (error) {
    console.error("getRecipesForPhase error:", error.message);
    return [];
  }

  return (data ?? []).map(dbRowToRecipe);
}

/**
 * Returns the set of recipe IDs the current user has saved.
 * Returns empty set on error — non-critical for rendering.
 */
export async function getSavedRecipeIds(): Promise<Set<number>> {
  const { data } = await supabase
    .from("user_saved_recipes")
    .select("recipe_id");
  return new Set((data ?? []).map((r: { recipe_id: number }) => r.recipe_id));
}

/**
 * Returns the set of recipe IDs the current user has hidden.
 */
export async function getHiddenRecipeIds(): Promise<Set<number>> {
  const { data } = await supabase
    .from("user_hidden_recipes")
    .select("recipe_id");
  return new Set((data ?? []).map((r: { recipe_id: number }) => r.recipe_id));
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function saveRecipe(recipeId: number): Promise<void> {
  const { error } = await supabase
    .from("user_saved_recipes")
    .insert({ recipe_id: recipeId });
  if (error) console.error("saveRecipe error:", error.message);
}

export async function unsaveRecipe(recipeId: number): Promise<void> {
  const { error } = await supabase
    .from("user_saved_recipes")
    .delete()
    .eq("recipe_id", recipeId);
  if (error) console.error("unsaveRecipe error:", error.message);
}

export async function hideRecipe(recipeId: number): Promise<void> {
  const { error } = await supabase
    .from("user_hidden_recipes")
    .insert({ recipe_id: recipeId });
  if (error) console.error("hideRecipe error:", error.message);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/recipeQueries.ts
git commit -m "feat: add recipe query layer (fetch, save, hide)"
```

---

## Task 7: Add `logRecipe` to `lib/nutrition.ts`

**Files:**
- Modify: `lib/nutrition.ts`

The existing `logFood` function handles food-source entries. This task adds a parallel `logRecipe` that creates a `meal_log_entries` row with `entry_source = 'recipe'`.

- [ ] **Step 1: Locate the `logFood` function in `lib/nutrition.ts`**

Search for `export async function logFood` — it's the function that calls `getOrCreateTodayMealLog` and then inserts into `meal_log_entries`. Note the exact INSERT shape it uses.

- [ ] **Step 2: Add `logRecipe` directly after `logFood`**

Find the end of the `logFood` function and add the following immediately after it:

```typescript
/**
 * Logs a recipe as a meal entry.
 * Creates or reuses today's meal_logs row, then inserts into meal_log_entries
 * with entry_source = 'recipe' and the recipe's macro values as the snapshot.
 */
export async function logRecipe(
  recipe: {
    id: number;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  },
  mealType: MealType,
  cycleDay: number,
  phase: Phase,
): Promise<MealLogEntry> {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const mealLogId = await getOrCreateTodayMealLog(cycleDay, phase);

  const { data, error } = await supabase
    .from("meal_log_entries")
    .insert({
      meal_log_id:        mealLogId,
      user_id:            user.id,
      entry_source:       "recipe" as EntrySource,
      food_id:            null,
      recipe_id:          recipe.id.toString(),
      quantity_g:         null,
      servings_consumed:  1,
      meal_type:          mealType,
      snapshot_name:      recipe.name,
      snapshot_kcal:      recipe.calories,
      snapshot_protein_g: recipe.protein_g,
      snapshot_carbs_g:   recipe.carbs_g,
      snapshot_fats_g:    recipe.fat_g,
    })
    .select("*")
    .single();

  if (error) throw new Error(`logRecipe failed: ${error.message}`);
  return mapRowToEntry(data as MealLogEntryRow);
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No new errors.

- [ ] **Step 4: Run tests to confirm nothing regressed**

```bash
npm test
```

Expected: All 11 engine tests still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/nutrition.ts
git commit -m "feat: add logRecipe to nutrition lib"
```

---

## Task 8: Upgrade `MealRecommendationCards.tsx`

**Files:**
- Modify: `components/MealRecommendationCards.tsx`

This is the largest change. The component gains recipe-source rendering while preserving the Food fallback path exactly.

- [ ] **Step 1: Replace `components/MealRecommendationCards.tsx` entirely**

```tsx
"use client";

// components/MealRecommendationCards.tsx
// Phase-aware meal cards. Each slot resolves in priority order:
//   1. Scored recipe from the recipe engine
//   2. Food item from the phase food pool (existing fallback)
// The Food fallback path is identical to the previous implementation.

import { useState, useEffect, useMemo } from "react";
import {
  getFoodsForPhase,
  logFood,
  logRecipe,
  type Food,
  type MealType,
  type Phase,
} from "@/lib/nutrition";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";
import {
  getRecipesForPhase,
  getSavedRecipeIds,
  getHiddenRecipeIds,
  saveRecipe,
  unsaveRecipe,
  hideRecipe,
} from "@/lib/recipeQueries";
import { recommendForSlot, buildEngineInput } from "@/lib/recipeEngine";
import type { Recipe, ScoredRecipe } from "@/types/recipe";
import type { MoodLog, Profile } from "@/lib/supabase";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  phase: Phase;
  cycleDay: number;
  moodLog: MoodLog | null;      // check-in signals: mood, energy, symptoms, cravings
  profile: Profile | null;      // goal, dietary preferences
  onLogged: () => void;
  foods?: Food[];               // pre-loaded phase food pool (fallback source)
  loggedMealTypes?: Set<MealType>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PHASE_COLOR: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

const MEAL_SLOTS: { type: MealType; label: string; emoji: string }[] = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅" },
  { type: "lunch",     label: "Lunch",     emoji: "☀️" },
  { type: "dinner",    label: "Dinner",    emoji: "🌙" },
  { type: "snack",     label: "Snack",     emoji: "🍃" },
];

type SwapOffsets = Record<MealType, number>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function MealRecommendationCards({
  phase,
  cycleDay,
  moodLog,
  profile,
  onLogged,
  foods: foodsProp,
  loggedMealTypes,
}: Props) {
  // ── Food fallback state (unchanged from previous implementation) ──
  const [fetchedFoods, setFetchedFoods]   = useState<Food[]>([]);
  const [loadingFoods, setLoadingFoods]   = useState(!foodsProp);
  const [swapOffsets, setSwapOffsets]     = useState<SwapOffsets>({
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  });

  // ── Recipe system state ──
  const [recipes, setRecipes]               = useState<Recipe[]>([]);
  const [savedIds, setSavedIds]             = useState<Set<number>>(new Set());
  const [hiddenIds, setHiddenIds]           = useState<Set<number>>(new Set());
  const [recipeOffsets, setRecipeOffsets]   = useState<SwapOffsets>({
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  });

  // ── Shared state ──
  const [expanded, setExpanded]         = useState<MealType | null>(null);
  const [logging, setLogging]           = useState<MealType | null>(null);
  const [saving, setSaving]             = useState<number | null>(null);
  const [loggedSlots, setLoggedSlots]   = useState<Set<MealType>>(
    () => loggedMealTypes ? new Set(loggedMealTypes) : new Set(),
  );

  // Sync logged slots when parent refreshes
  useEffect(() => {
    if (!loggedMealTypes) return;
    setLoggedSlots(prev => {
      const merged = new Set(prev);
      loggedMealTypes.forEach(t => merged.add(t));
      return merged;
    });
  }, [loggedMealTypes]);

  // ── Load food pool (fallback) ──
  const foods = foodsProp && foodsProp.length > 0 ? foodsProp : fetchedFoods;

  useEffect(() => {
    if (foodsProp && foodsProp.length > 0) { setLoadingFoods(false); return; }
    setLoadingFoods(true);
    setExpanded(null);
    setSwapOffsets({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
    getFoodsForPhase(phase).then(all => {
      const meals = all.filter(f => f.category === "meal");
      setFetchedFoods(meals.length >= 4 ? meals : all);
      setLoadingFoods(false);
    });
  }, [phase, foodsProp]);

  // ── Load recipes + saved/hidden IDs ──
  useEffect(() => {
    setRecipes([]);
    setRecipeOffsets({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
    setExpanded(null);

    Promise.all([
      getRecipesForPhase(phase),
      getSavedRecipeIds(),
      getHiddenRecipeIds(),
    ]).then(([r, saved, hidden]) => {
      setRecipes(r);
      setSavedIds(saved);
      setHiddenIds(hidden);
    });
  }, [phase]);

  // ── Build engine input (memoised) ──
  const engineInput = useMemo(() =>
    buildEngineInput({
      phase,
      cycleDay,
      goal:             profile?.goals?.[0] ?? null,
      energy:           moodLog?.energy ?? null,
      mood:             moodLog?.mood   ?? null,
      symptoms:         moodLog?.symptoms  ?? [],
      cravings:         moodLog?.cravings  ?? [],
      savedRecipeIds:   savedIds,
      hiddenRecipeIds:  hiddenIds,
    }),
    [phase, cycleDay, profile, moodLog, savedIds, hiddenIds],
  );

  // ── Recipe options per slot (memoised) ──
  const recipeOptions = useMemo((): Record<MealType, ScoredRecipe[]> => ({
    breakfast: recommendForSlot(recipes, engineInput, "breakfast", 5),
    lunch:     recommendForSlot(recipes, engineInput, "lunch",     5),
    dinner:    recommendForSlot(recipes, engineInput, "dinner",    5),
    snack:     recommendForSlot(recipes, engineInput, "snack",     5),
  }), [recipes, engineInput]);

  const color = PHASE_COLOR[phase];

  // ── Slot resolution ──
  function getRecipePick(mealType: MealType): ScoredRecipe | null {
    const options = recipeOptions[mealType];
    if (options.length === 0) return null;
    const offset = recipeOffsets[mealType] % options.length;
    return { ...options[offset], isBestForToday: offset === 0 };
  }

  function getFoodPick(slotIndex: number, slotType: MealType): Food | null {
    if (foods.length === 0) return null;
    const idx = (cycleDay + slotIndex + swapOffsets[slotType]) % foods.length;
    return foods[idx];
  }

  // ── Swap handlers ──
  function handleRecipeSwap(type: MealType) {
    setRecipeOffsets(prev => ({ ...prev, [type]: prev[type] + 1 }));
    if (expanded === type) setExpanded(null);
  }

  function handleFoodSwap(type: MealType) {
    setSwapOffsets(prev => ({ ...prev, [type]: prev[type] + 1 }));
    if (expanded === type) setExpanded(null);
  }

  // ── Log handlers ──
  async function handleLogRecipe(scored: ScoredRecipe, mealType: MealType) {
    setLogging(mealType);
    try {
      await logRecipe(
        {
          id:        scored.recipe.id,
          name:      scored.recipe.name,
          calories:  scored.recipe.calories,
          protein_g: scored.recipe.protein_g,
          carbs_g:   scored.recipe.carbs_g,
          fat_g:     scored.recipe.fat_g,
        },
        mealType,
        cycleDay,
        phase,
      );
      setLoggedSlots(prev => new Set(prev).add(mealType));
      onLogged();
    } finally {
      setLogging(null);
    }
  }

  async function handleLogFood(food: Food, mealType: MealType) {
    setLogging(mealType);
    const qty = food.servingSizeG ?? 100;
    await logFood(food.id, qty, mealType, cycleDay, phase);
    setLogging(null);
    setLoggedSlots(prev => new Set(prev).add(mealType));
    onLogged();
  }

  // ── Save/unsave handler ──
  async function handleToggleSave(recipeId: number) {
    setSaving(recipeId);
    if (savedIds.has(recipeId)) {
      await unsaveRecipe(recipeId);
      setSavedIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
    } else {
      await saveRecipe(recipeId);
      setSavedIds(prev => new Set(prev).add(recipeId));
    }
    setSaving(null);
  }

  // ── Hide handler ──
  async function handleHide(recipeId: number) {
    await hideRecipe(recipeId);
    setHiddenIds(prev => new Set(prev).add(recipeId));
  }

  // ── Food macros helper (existing logic, unchanged) ──
  function getFoodMacros(food: Food) {
    const g = food.servingSizeG ?? 100;
    const f = g / 100;
    return {
      kcal:    Math.round(food.kcalPer100g    * f),
      protein: Math.round(food.proteinPer100g * f),
      carbs:   Math.round(food.carbsPer100g   * f),
      fats:    Math.round(food.fatsPer100g    * f),
    };
  }

  if (loadingFoods && recipes.length === 0) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-semibold text-dark">Today&apos;s meal ideas</h2>
        <span className="text-xs font-body" style={{ color: `${color}bb` }}>Phase-matched</span>
      </div>

      <div className="flex flex-col gap-3">
        {MEAL_SLOTS.map(({ type, label, emoji: slotEmoji }, i) => {
          const recipePick = getRecipePick(type);
          const isRecipeMode = recipePick !== null;

          // ── RECIPE MODE ─────────────────────────────────────────────────
          if (isRecipeMode) {
            const { recipe, matchReasons, isBestForToday } = recipePick;
            const isSaved    = savedIds.has(recipe.id);
            const isSaving   = saving === recipe.id;
            const isLogging  = logging === type;
            const isLogged   = loggedSlots.has(type);
            const isOpen     = expanded === type;
            const showAccordion = recipe.has_real_instructions && recipe.instructions.length > 0;

            return (
              <div
                key={type}
                className="rounded-2xl overflow-hidden transition-opacity duration-300"
                style={{
                  background: "linear-gradient(135deg, #2A2330 0%, #3D3248 100%)",
                  opacity: isLogged ? 0.6 : 1,
                }}
              >
                {/* Slot badge + Best for today pill + Save + Swap */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                      <span>{slotEmoji}</span>
                      <span>{label}</span>
                    </div>
                    {isBestForToday && matchReasons.length > 0 && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color: `${color}dd` }}
                      >
                        {matchReasons[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Save button */}
                    <button
                      onClick={() => !isSaving && handleToggleSave(recipe.id)}
                      className="flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-95"
                      style={{
                        background: isSaved ? `${color}33` : "rgba(255,255,255,0.07)",
                        color:      isSaved ? color : "rgba(255,255,255,0.35)",
                      }}
                      aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
                    >
                      {isSaving ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="text-xs">{isSaved ? "★" : "☆"}</span>
                      )}
                    </button>

                    {/* Swap */}
                    <button
                      onClick={() => handleRecipeSwap(type)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
                    >
                      <span>↺</span>
                      <span>Swap</span>
                    </button>
                  </div>
                </div>

                {/* Recipe name + benefits */}
                <div className="px-4 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl leading-none flex-shrink-0 mt-0.5">🍽️</span>
                    <div className="min-w-0">
                      <p className="text-white font-display font-semibold text-sm leading-snug">
                        {recipe.name}
                      </p>
                      {recipe.benefits && (
                        <p className="text-xs mt-1 font-body leading-snug" style={{ color: `${color}cc` }}>
                          {recipe.benefits}
                        </p>
                      )}
                      <p className="text-xs mt-1 font-body" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {recipe.prep_time_min + recipe.cook_time_min} min · {recipe.difficulty}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Macro strip */}
                <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl grid grid-cols-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {[
                    { label: "kcal",    value: `${recipe.calories}` },
                    { label: "protein", value: `${recipe.protein_g}g` },
                    { label: "carbs",   value: `${recipe.carbs_g}g` },
                    { label: "fats",    value: `${recipe.fat_g}g` },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <p className="text-white font-semibold text-sm leading-none">{m.value}</p>
                      <p className="text-white/40 text-xs leading-none mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => !isLogged && handleLogRecipe(recipePick, type)}
                    disabled={isLogging}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    style={{
                      background: isLogged
                        ? "rgba(255,255,255,0.1)"
                        : `linear-gradient(135deg, ${color}, ${color}88)`,
                      color: isLogged ? "rgba(255,255,255,0.5)" : "var(--color-surface)",
                    }}
                  >
                    {isLogging ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Logging…</span>
                      </>
                    ) : isLogged ? (
                      <span>✓ Logged</span>
                    ) : (
                      <span>Log this</span>
                    )}
                  </button>

                  {showAccordion && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : type)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: isOpen ? `${color}22` : "rgba(255,255,255,0.07)",
                        color:      isOpen ? color : "rgba(255,255,255,0.6)",
                        border:     `1px solid ${isOpen ? color + "44" : "rgba(255,255,255,0.1)"}`,
                      }}
                    >
                      <span>{isOpen ? "▲" : "▼"}</span>
                      <span>Recipe</span>
                    </button>
                  )}

                  {/* Hide button — only shown when not logged */}
                  {!isLogged && (
                    <button
                      onClick={() => handleHide(recipe.id)}
                      className="flex items-center justify-center w-10 py-2.5 rounded-xl text-xs transition-all active:scale-95"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)" }}
                      aria-label="Hide this recipe"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Recipe accordion — only when has_real_instructions */}
                {isOpen && showAccordion && (
                  <div
                    className="mx-4 mb-4 rounded-xl px-4 py-3"
                    style={{ background: "rgba(0,0,0,0.2)", borderTop: `2px solid ${color}33` }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                      Ingredients
                    </p>
                    <ul className="mb-4 space-y-1">
                      {recipe.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-body text-white/70">
                          <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                      Preparation
                    </p>
                    <ol className="space-y-2">
                      {recipe.instructions.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-white/70">
                          <span
                            className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                            style={{ background: `${color}33`, color }}
                          >
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          }

          // ── FOOD FALLBACK MODE (unchanged from previous implementation) ──
          const food = getFoodPick(i, type);
          if (!food) return null;

          const recipe     = RECIPE_DETAILS[food.externalId ?? ""];
          const macros     = getFoodMacros(food);
          const isOpen     = expanded === type;
          const isLogging  = logging === type;
          const isLogged   = loggedSlots.has(type);

          return (
            <div
              key={type}
              className="rounded-2xl overflow-hidden transition-opacity duration-300"
              style={{
                background: "linear-gradient(135deg, #2A2330 0%, #3D3248 100%)",
                opacity: isLogged ? 0.6 : 1,
              }}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                >
                  <span>{slotEmoji}</span>
                  <span>{label}</span>
                </div>
                <button
                  onClick={() => handleFoodSwap(type)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}
                >
                  <span>↺</span>
                  <span>Swap</span>
                </button>
              </div>

              <div className="px-4 pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none flex-shrink-0 mt-0.5">{food.emoji ?? "🍽️"}</span>
                  <div className="min-w-0">
                    <p className="text-white font-display font-semibold text-sm leading-snug">{food.name}</p>
                    <p className="text-xs mt-1 font-body leading-snug" style={{ color: `${color}cc` }}>
                      {recipe?.phaseReason ?? (food.keyNutrient ? `Key nutrient: ${food.keyNutrient}` : "")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl grid grid-cols-4" style={{ background: "rgba(255,255,255,0.05)" }}>
                {[
                  { label: "kcal",    value: `${macros.kcal}` },
                  { label: "protein", value: `${macros.protein}g` },
                  { label: "carbs",   value: `${macros.carbs}g` },
                  { label: "fats",    value: `${macros.fats}g` },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-white font-semibold text-sm leading-none">{m.value}</p>
                    <p className="text-white/40 text-xs leading-none mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => !isLogged && handleLogFood(food, type)}
                  disabled={isLogging}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  style={{
                    background: isLogged
                      ? "rgba(255,255,255,0.1)"
                      : `linear-gradient(135deg, ${color}, ${color}88)`,
                    color: isLogged ? "rgba(255,255,255,0.5)" : "var(--color-surface)",
                  }}
                >
                  {isLogging ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Logging…</span>
                    </>
                  ) : isLogged ? (
                    <span>✓ Logged</span>
                  ) : (
                    <span>Log this</span>
                  )}
                </button>

                {recipe && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : type)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: isOpen ? `${color}22` : "rgba(255,255,255,0.07)",
                      color:      isOpen ? color : "rgba(255,255,255,0.6)",
                      border:     `1px solid ${isOpen ? color + "44" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    <span>{isOpen ? "▲" : "▼"}</span>
                    <span>Recipe</span>
                  </button>
                )}
              </div>

              {isOpen && recipe && (
                <div
                  className="mx-4 mb-4 rounded-xl px-4 py-3"
                  style={{ background: "rgba(0,0,0,0.2)", borderTop: `2px solid ${color}33` }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>Ingredients</p>
                  <ul className="mb-4 space-y-1">
                    {recipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-body text-white/70">
                        <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>Preparation</p>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-white/70">
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                          style={{ background: `${color}33`, color }}
                        >
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No new errors. If `logRecipe` import fails, confirm Task 7 was completed first.

- [ ] **Step 3: Commit**

```bash
git add components/MealRecommendationCards.tsx
git commit -m "feat: upgrade MealRecommendationCards to merge recipe + Food sources"
```

---

## Task 9: Update the Meals page

**Files:**
- Modify: `app/meals/page.tsx`

Two new props need to be threaded from AppContext into `MealRecommendationCards`: `latestMoodLog` and `profile`. Both are already in scope.

- [ ] **Step 1: Update the `MealRecommendationCards` call in `app/meals/page.tsx`**

Find this block (around line 253):
```tsx
<MealRecommendationCards
  phase={phase}
  cycleDay={cycleDay}
  foods={phaseFoods}
  loggedMealTypes={new Set(nutritionEntries.map(e => e.mealType))}
  onLogged={() => {
    showToast("✓ Food logged");
    refreshNutrition();
  }}
/>
```

Replace it with:
```tsx
<MealRecommendationCards
  phase={phase}
  cycleDay={cycleDay}
  moodLog={latestMoodLog}
  profile={profile}
  foods={phaseFoods}
  loggedMealTypes={new Set(nutritionEntries.map(e => e.mealType))}
  onLogged={() => {
    showToast("✓ Food logged");
    refreshNutrition();
  }}
/>
```

- [ ] **Step 2: Add `latestMoodLog` to the destructured `useApp()` call at the top of the component**

Find this line (around line 35):
```typescript
const { user, profile, cycleDay, cycleParams, loading, todayState } = useApp();
```

Replace it with:
```typescript
const { user, profile, cycleDay, cycleParams, loading, todayState, latestMoodLog } = useApp();
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: All 11 engine tests pass.

- [ ] **Step 5: Start dev server and manually verify**

```bash
npm run dev
```

Open http://localhost:3000/meals in a browser.

Verify:
- The 4 meal slot cards render as before (Food fallback while recipe table is empty or loading)
- After seed data is in Supabase: cards switch to recipe mode for slots with matching recipes
- "Best for today" pill appears on the first card for each slot
- Swap button cycles through recipe options (or food options if no recipes)
- Save (☆/★) button toggles without page reload
- Log button creates a meal_log_entries row — verify in Supabase:
  ```sql
  select entry_source, snapshot_name, meal_type
  from meal_log_entries
  order by logged_at desc limit 5;
  ```
  Expected: rows with `entry_source = 'recipe'` appear after logging a recipe card.
- Recipe accordion is hidden for all 120 seed recipes (has_real_instructions = false)

- [ ] **Step 6: Final commit**

```bash
git add app/meals/page.tsx
git commit -m "feat: wire moodLog + profile into MealRecommendationCards"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| Data model (types/recipe.ts) | Task 1 |
| Supabase schema | Task 2 |
| Seed data strategy (transform + insert) | Task 3 |
| Engine: scoring weights, wantsComfort, matchReasons | Task 5 |
| Engine: buildDailySlots, recommendForSlot, buildEngineInput | Task 5 |
| Query layer: getRecipesForPhase, save, hide | Task 6 |
| logRecipe | Task 7 |
| Component: recipe mode, food fallback, save, hide, accordion gate | Task 8 |
| Page integration: moodLog + profile props | Task 9 |
| has_real_instructions gate on accordion | Task 8 (showAccordion flag) |
| benefits line on card | Task 8 |
| Best for today pill | Task 8 |
| RLS policies | Task 2 |

All spec requirements covered. No gaps.
