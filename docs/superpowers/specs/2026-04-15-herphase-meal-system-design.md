# HerPhase Meal Intelligence System — Design Spec
**Date:** 2026-04-15
**Status:** Approved
**Scope:** Recipe database, recommendation engine, upgraded meal cards

---

## 1. Problem

HerPhase already has a working meal recommendation UI (`MealRecommendationCards.tsx`) that picks `Food` objects from a phase-filtered pool and fills 4 daily slots (breakfast / lunch / dinner / snack). The system works but has two limits:

1. `Food` objects are ingredients, not full recipes — no instructions, no benefits explanation, no prep time, no meal-type awareness.
2. The recommendation logic is deterministic rotation (`(cycleDay + slotIndex + swapOffset) % pool.length`) — it doesn't use check-in signals (mood, energy, symptoms, cravings).

A `meal_app_package` was provided containing 120 seed recipes, a Supabase schema, a scoring engine, and a UI component. This spec defines how to audit, redesign, and integrate that package into a production-grade system.

---

## 2. Goals

- Replace the Food-based daily slot picks with scored recipe objects where available, falling back to Food items when no recipe matches.
- Wire `todayState` signals (phase, energy, mood, symptoms, cravings, training intensity) into a real scoring engine.
- Add save / hide recipe interactions.
- Gate recipe instruction accordions behind a `has_real_instructions` flag — never show placeholder content.
- Keep the existing card UI and logging flow intact. No regressions.

---

## 3. Audit of the Package

### What is good
- Schema foundation: `recipes`, `user_saved_recipes`, `user_recipe_feedback` with RLS policies.
- Engine structure: `scoreRecipe()` + `recommendMeals()` separation is clean.
- `symptomTagMap` and `goalTagMap` pattern is the right approach.
- GIN indexes on array columns.
- 120 seed recipes as a starting dataset.

### What is weak
- `phase` is a single string — a recipe can only belong to one phase. Multi-phase recipes impossible.
- No `meal_types` field — a breakfast recipe competes against a dinner recipe in the same pool.
- `estimated_macros` is a JSONB blob — can't filter/order by protein_g in SQL without casting.
- `app_flags` JSONB is redundant — replaced by typed boolean columns.
- Instructions are all 3-line placeholder text — not usable as shown.
- Engine ignores `cravings` and `energy` from check-in.
- Engine `reasons` array pushes a string even when no tags matched (`Aligned with ${goal}` fires unconditionally).
- `RecipeCards.tsx` is a desktop-first browser with no daily recommendations, no save actions, no "best for today" logic — doesn't fit the app.
- No `user_hidden_recipes` table — no way to hide/dislike a recipe persistently.

### What is missing
- `benefits` field: one-sentence "why this works today" explanation per recipe.
- `has_real_instructions` flag to gate accordion.
- `user_hidden_recipes` table.
- `meal_types` array on recipes.
- Flat macro columns for SQL filtering.
- Energy and craving signals in the engine.
- Comfort food derivation logic.

---

## 4. Architecture: Approach C — Lib-layer engine with Supabase at the edges

```
Supabase (recipes table)
    ↓
lib/recipeQueries.ts       — fetch, save, hide (all DB interaction)
    ↓
lib/recipeEngine.ts        — pure scoring, no Supabase imports
    ↓
components/MealRecommendationCards.tsx   — upgraded, merges recipe + Food sources
    ↓
app/meals/page.tsx         — passes todayState + profile into cards
```

The engine is pure TypeScript — testable in isolation, no Supabase dependency.

---

## 5. Data Model

### `Recipe` type (`types/recipe.ts`)

```typescript
export type Phase    = "menstrual" | "follicular" | "ovulation" | "luteal";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Recipe {
  id: number;
  slug: string;
  name: string;
  phases: Phase[];
  meal_types: MealType[];
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
  is_quick: boolean;          // prep_time_min <= 15
  sort_priority: number;
  image_url: string | null;
  benefits: string;
}

export interface ScoredRecipe {
  recipe: Recipe;
  score: number;
  matchReasons: string[];     // human-readable, shown on card
  isBestForToday: boolean;
}
```

---

## 6. Supabase Schema

### `recipes` (master library, read-only for users)

```sql
create table public.recipes (
  id                    bigint generated always as identity primary key,
  slug                  text not null unique,
  name                  text not null,
  phases                text[] not null default '{}',
  meal_types            text[] not null default '{}',
  prep_time_min         integer not null check (prep_time_min > 0),
  cook_time_min         integer not null default 0,
  difficulty            text not null check (difficulty in ('easy','medium','hard')),
  macro_profile         text not null check (macro_profile in ('high_protein','balanced','carb_focus','fat_focus')),
  goals                 text[] not null default '{}',
  phase_tags            text[] not null default '{}',
  symptom_tags          text[] not null default '{}',
  energy_tags           text[] not null default '{}',
  calories              integer not null,
  protein_g             integer not null,
  carbs_g               integer not null,
  fat_g                 integer not null,
  fiber_g               integer not null default 0,
  ingredients           text[] not null default '{}',
  instructions          text[] not null default '{}',
  has_real_instructions boolean not null default false,
  is_vegetarian         boolean not null default false,
  is_pescatarian        boolean not null default false,
  is_high_protein       boolean not null default false,
  is_comfort_meal       boolean not null default false,
  is_low_bloat          boolean not null default false,
  is_quick              boolean generated always as (prep_time_min <= 15) stored,
  sort_priority         integer not null default 0,
  image_url             text,
  benefits              text not null default '',
  created_at            timestamptz not null default now()
);

-- Indexes
create index idx_recipes_phases_gin       on public.recipes using gin(phases);
create index idx_recipes_meal_types_gin   on public.recipes using gin(meal_types);
create index idx_recipes_goals_gin        on public.recipes using gin(goals);
create index idx_recipes_phase_tags_gin   on public.recipes using gin(phase_tags);
create index idx_recipes_symptom_tags_gin on public.recipes using gin(symptom_tags);
create index idx_recipes_prep             on public.recipes(prep_time_min);
create index idx_recipes_protein          on public.recipes(protein_g);
```

### `user_saved_recipes`

```sql
create table public.user_saved_recipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipe_id  bigint not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);
```

### `user_hidden_recipes` (new)

```sql
create table public.user_hidden_recipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipe_id  bigint not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);
```

### `user_recipe_feedback` (simplified from package)

```sql
create table public.user_recipe_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipe_id  bigint not null references public.recipes(id) on delete cascade,
  rating     smallint check (rating between 1 and 5),
  cooked_at  timestamptz,
  notes      text,
  created_at timestamptz not null default now()
);
```

RLS: recipes readable by authenticated users. All user tables are own-row-only (select/insert/delete/update).

---

## 7. Recommendation Engine (`lib/recipeEngine.ts`)

### Input

```typescript
export interface RecipeEngineInput {
  phase: Phase;
  cycleDay: number;
  goal: string | null;
  trainingIntensity: "rest" | "light" | "moderate" | "hard" | null;
  energy: number | null;          // 1–5 from check-in
  mood: number | null;            // 1–5 from check-in
  symptoms: string[];
  cravings: string[];
  mealType: MealType | null;      // null = score all types
  maxPrepTime: number | null;
  savedRecipeIds: Set<number>;
  hiddenRecipeIds: Set<number>;
}
```

### Scoring weights

| Signal | Points | Cap |
|---|---|---|
| Phase match (`phases` contains current phase) | +30 | — |
| Symptom tag overlap | +8 per match | 24 |
| Energy match (low energy → quick/light; peak → any) | +12 | — |
| Comfort match (`wantsComfort && is_comfort_meal`) | +10 | — |
| Goal tag overlap | +5 per match | 15 |
| Training intensity match | +8 | — |
| Prep time fits `maxPrepTime` | +8 | — |
| Craving match via `symptom_tags` | +6 per match | 12 |
| Saved by user | +4 | — |
| `sort_priority` (curator override) | +sort_priority | — |
| Hidden by user | hard exclude (filtered before scoring) | — |
| Disliked ingredient | −40 | — |

Max achievable score: ~100 (phase + symptoms capped + energy + comfort + goal capped + training + prep + cravings capped + saved + priority).

### `wantsComfort` derivation (internal)

```typescript
const wantsComfort =
  ((mood !== null && mood <= 2) || symptoms.includes("low_mood") || symptoms.includes("cramps")) &&
  (phase === "menstrual" || phase === "luteal");
```

### `matchReasons` — only fire when the condition actually scored

Each reason string is pushed only inside the branch that added points, preventing phantom reasons.

### Key functions

```typescript
// Score one recipe against input. Returns null if hidden.
function scoreRecipe(recipe: Recipe, input: RecipeEngineInput): ScoredRecipe | null

// Score all recipes for a specific meal slot. Returns top N.
function recommendForSlot(recipes: Recipe[], input: RecipeEngineInput, mealType: MealType, limit?: number): ScoredRecipe[]

// Build all 4 daily slots. Returns top-1 per slot or null (triggers Food fallback).
export function buildDailySlots(recipes: Recipe[], input: RecipeEngineInput): Record<MealType, ScoredRecipe | null>

// Build engine input from app context values.
export function buildEngineInput(params: {
  phase: Phase;
  cycleDay: number;
  todayState: TodayState | null;
  profile: Profile | null;
  savedRecipeIds: Set<number>;
  hiddenRecipeIds: Set<number>;
  mealType?: MealType | null;
  maxPrepTime?: number | null;
}): RecipeEngineInput
```

---

## 8. Query Layer (`lib/recipeQueries.ts`)

```typescript
// Fetch all recipes for a phase. Excludes hidden. Joins saved state.
export async function getRecipesForPhase(phase: Phase): Promise<Recipe[]>

// Fetch user's saved recipe IDs.
export async function getSavedRecipeIds(): Promise<Set<number>>

// Fetch user's hidden recipe IDs.
export async function getHiddenRecipeIds(): Promise<Set<number>>

// Save / unsave a recipe.
export async function saveRecipe(recipeId: number): Promise<void>
export async function unsaveRecipe(recipeId: number): Promise<void>

// Hide a recipe permanently.
export async function hideRecipe(recipeId: number): Promise<void>
```

---

## 9. Component Upgrade (`MealRecommendationCards.tsx`)

### New props

```typescript
interface Props {
  phase: Phase;
  cycleDay: number;
  todayState: TodayState | null;   // NEW — drives engine input
  profile: Profile | null;         // NEW — goal + preferences
  onLogged: () => void;
  foods?: Food[];
  loggedMealTypes?: Set<MealType>;
}
```

### Slot resolution logic

```
For each of [breakfast, lunch, dinner, snack]:
  1. Check buildDailySlots() output for this slot
  2. If ScoredRecipe exists → render RecipeCard (recipe mode)
  3. If null → render existing Food card (food mode) — no change to current behaviour
```

### Recipe card additions (recipe mode only)

- **"Best for today" pill** on `isBestForToday === true` card — shows `matchReasons[0]`
- **`benefits` line** below recipe name (replaces `phaseReason` from `recipeDetails.ts`)
- **Save button** (bookmark icon, top-right) — toggles saved state
- **Recipe accordion** — only rendered when `has_real_instructions === true`
- Macro strip, slot badge, swap, log button — unchanged

### Food card (fallback mode)
Identical to current behaviour. Zero regression.

---

## 10. Meals Page Changes (`app/meals/page.tsx`)

Only the `MealRecommendationCards` call changes:

```tsx
<MealRecommendationCards
  phase={phase}
  cycleDay={cycleDay}
  todayState={todayState}      // new
  profile={profile}            // new
  foods={phaseFoods}
  loggedMealTypes={new Set(nutritionEntries.map(e => e.mealType))}
  onLogged={() => { showToast("✓ Food logged"); refreshNutrition(); }}
/>
```

`todayState` and `profile` are already in scope from `useApp()`.

---

## 11. Seed Data Strategy

The 120 package recipes are usable as seed data with the following adjustments:

- `phase` (single) → `phases` (array, same value wrapped in `[]`)
- `tags` split: menstrual/phase-specific tags → `phase_tags`, symptom names → `symptom_tags`, energy-level tags → `energy_tags`
- `macro_type` → `macro_profile`
- `estimated_macros.*` → flat columns
- `app_flags` → typed boolean columns
- `has_real_instructions: false` for all 120 — accordion hidden by default
- `meal_types` → assigned during seed transform using a deterministic rule: recipes with `macro_profile === 'carb_focus'` or containing "oat/egg/smoothie/yogurt" in name → include "breakfast"; all savory recipes → include "lunch" and "dinner"; recipes with `prep_time_min <= 10` and `calories < 300` → include "snack". The seed transform script encodes this logic explicitly.
- `benefits` → empty string for now; can be filled per recipe later

---

## 12. New File Structure

```
herphase/
  types/
    recipe.ts                         NEW — Recipe, ScoredRecipe, RecipeEngineInput
  lib/
    recipeEngine.ts                   NEW — pure scoring engine
    recipeQueries.ts                  NEW — Supabase interaction for recipes
    (existing lib files unchanged)
  components/
    MealRecommendationCards.tsx       MODIFIED — merges recipe + Food sources
  app/meals/
    page.tsx                          MODIFIED — passes todayState + profile
  supabase/migrations/
    007_recipes.sql                   NEW — schema + seed data migration
  docs/superpowers/specs/
    2026-04-15-herphase-meal-system-design.md   THIS FILE
```

---

## 13. Out of Scope (this iteration)

- Expanding the recipe dataset beyond 120 entries
- Filling in real `benefits` text for each recipe
- Writing real instructions (future — set `has_real_instructions: true` per recipe as content is added)
- Meal planning / weekly view
- Dashboard recipe hero card (integration point exists, not built here)
- Insights meal history (integration point exists, not built here)
- Dietary filter UI (is_vegetarian etc. — engine supports it, no UI filter chip this iteration)

---

## 14. Integration Points for Next Iteration

| Location | What to connect |
|---|---|
| `app/dashboard/page.tsx` | Surface `buildDailySlots()` hero recipe as a meal card |
| `app/insights/page.tsx` | Query `user_recipe_feedback` for cooked meal history |
| `app/meals/page.tsx` | Add filter chips (prep time, dietary, goal) above cards |
| `lib/recipeEngine.ts` | Add `dislikedIngredients` from profile when that field exists |
