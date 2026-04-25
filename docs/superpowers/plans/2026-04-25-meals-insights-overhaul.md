# Meals + Insights Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge dual recipe UIs into one clean component, fix meal data architecture, add period flow tracking, surface sleep and weekly data, and add symptom pattern insights.

**Architecture:** Six independent priorities delivered in order. P1–P2 are structural fixes that unblock clean UX. P3–P6 are additive features that layer on the cleaned foundation. Each task produces working, committable code.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase. Design tokens: `--color-bg`, `--color-surface`, `--color-text`, `--color-text-mid`, `--color-text-dim`, `--color-border`. Phase colors: menstrual=#F87171, follicular=#34D399, ovulation=#FBBF24, luteal=#A78BFA.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/UnifiedMealSection.tsx` | Create | Merged recipe panel — static (mealEngine) + food items with filters and modal |
| `components/RecipePreviewModal.tsx` | Create | Full-screen recipe preview with "Log this meal" button |
| `app/meals/page.tsx` | Modify | Replace RecipeRecommendationPanel + MealRecommendationCards with UnifiedMealSection |
| `lib/foods.ts` | Modify | Remove second-batch duplicate food IDs (dead code never seeded to DB) |
| `supabase/migrations/014_flow_intensity.sql` | Create | Add `flow_intensity TEXT` nullable column to mood_logs |
| `lib/supabase.ts` | Modify | Add `flow_intensity` to saveMoodLog params |
| `lib/dailyPlan.ts` | Modify | Add flow_intensity to CheckInSnapshot; penalise readiness when heavy |
| `app/mood/page.tsx` | Modify | Add flow intensity picker (menstrual phase only) |
| `app/insights/page.tsx` | Modify | Add meal_log_entries for meals tab; add SleepChart; add symptom pattern cards |
| `components/SleepChart.tsx` | Create | Sleep hours + quality chart, x-axis by log index, colored by phase |
| `components/WeeklySummaryCard.tsx` | Create | Mon–Sun summary: workouts, meals, avg mood, weight trend, best PR |
| `app/dashboard/page.tsx` | Modify | Add WeeklySummaryCard below NutritionCard |

---

## Task 1: Create RecipePreviewModal component

**Files:**
- Create: `components/RecipePreviewModal.tsx`

This full-screen modal displays a recipe's ingredients + steps and has a single "Log this meal" button. It knows nothing about scoring — it only receives pre-formed data and calls back when logged.

- [ ] **Step 1: Create the file**

```tsx
"use client";

// components/RecipePreviewModal.tsx
// Full-screen recipe preview overlay. Called by UnifiedMealSection.
// Logging happens exclusively here — cards themselves have no log button.

import { useState } from "react";

export interface RecipePreviewData {
  id: string;
  name: string;
  phaseReason?: string;
  ingredients: string[];        // already-formatted strings
  steps: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  prepMin?: number;
  difficulty?: string;
  tags?: string[];
}

interface Props {
  recipe: RecipePreviewData;
  phaseColor: string;
  onClose: () => void;
  onLog: () => Promise<void>;
}

export default function RecipePreviewModal({ recipe, phaseColor, onClose, onLog }: Props) {
  const [logging, setLogging] = useState(false);
  const [logged,  setLogged]  = useState(false);

  async function handleLog() {
    if (logged || logging) return;
    setLogging(true);
    try {
      await onLog();
      setLogged(true);
    } finally {
      setLogging(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-safe pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90"
          style={{ background: "var(--color-surface)" }}
        >
          ←
        </button>
        <h2 className="font-display font-semibold text-base text-dark leading-snug text-center flex-1 mx-3 truncate">
          {recipe.name}
        </h2>
        <div className="w-9" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Phase reason */}
        {recipe.phaseReason && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: `${phaseColor}12`, border: `1px solid ${phaseColor}30` }}
          >
            <p className="text-xs font-body leading-relaxed" style={{ color: phaseColor }}>
              {recipe.phaseReason}
            </p>
          </div>
        )}

        {/* Macros strip */}
        <div
          className="rounded-2xl px-3 py-3 grid grid-cols-4"
          style={{ background: "var(--color-surface)" }}
        >
          {[
            { label: "kcal",    value: `${recipe.kcal}`     },
            { label: "protein", value: `${recipe.protein}g` },
            { label: "carbs",   value: `${recipe.carbs}g`   },
            { label: "fat",     value: `${recipe.fats}g`    },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-dark font-semibold text-sm">{m.value}</p>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Meta */}
        {(recipe.prepMin || recipe.difficulty) && (
          <div className="flex gap-3">
            {recipe.prepMin && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "var(--color-surface)", color: "var(--color-text-mid)" }}
              >
                ⏱ {recipe.prepMin} min
              </span>
            )}
            {recipe.difficulty && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "var(--color-surface)", color: "var(--color-text-mid)" }}
              >
                {recipe.difficulty}
              </span>
            )}
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: `${phaseColor}99` }}
            >
              Ingredients
            </p>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-body text-[var(--color-text-mid)]">
                  <span className="mt-1 flex-shrink-0 text-xs" style={{ color: phaseColor }}>•</span>
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: `${phaseColor}99` }}
            >
              Preparation
            </p>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-body text-[var(--color-text-mid)]">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                    style={{ background: `${phaseColor}22`, color: phaseColor }}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Spacer so button doesn't cover last step */}
        <div className="h-20" />
      </div>

      {/* Sticky log button */}
      <div
        className="flex-shrink-0 px-4 pb-safe pb-6 pt-3"
        style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}
      >
        <button
          onClick={handleLog}
          disabled={logging || logged}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: logged
              ? "rgba(0,0,0,0.08)"
              : `linear-gradient(135deg, ${phaseColor}, ${phaseColor}88)`,
            color: logged ? "var(--color-text-dim)" : "white",
          }}
        >
          {logging ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Logging…</span></>
          ) : logged ? (
            "✓ Logged"
          ) : (
            "Log this meal"
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors on this file (it imports nothing from project yet).

- [ ] **Step 3: Commit**

```bash
git add components/RecipePreviewModal.tsx
git commit -m "feat: add RecipePreviewModal — full-screen recipe overlay with log button"
```

---

## Task 2: Create UnifiedMealSection component

**Files:**
- Create: `components/UnifiedMealSection.tsx`
- Reads from: `lib/mealEngine` (static recipes), `lib/recipeDetails` (RECIPE_DETAILS), `lib/nutrition` (logStaticRecipe, logFood)

This merges RecipeRecommendationPanel and MealRecommendationCards. Cards show name/macros/phase reason/time. Tapping opens RecipePreviewModal. No direct log button on cards.

Filters: All / Bowls / Wraps / High Protein / Iron-rich.
- Static recipes (bowl/wrap from mealEngine): filtered by type + functional_tags.
- Phase foods (Food[]): Iron-rich = `food.keyNutrient?.toLowerCase().includes("iron")`.
- Iron-rich static: `recipe.functional_tags.includes("iron_rich")` OR phase === "menstrual".

- [ ] **Step 1: Create the component**

```tsx
"use client";

// components/UnifiedMealSection.tsx
// Single source of truth for meal recommendations on the Meals page.
// Merges static engine-scored recipes (mealEngine) with phase Food items.
// Tapping any card opens RecipePreviewModal — logging only happens from there.

import { useMemo, useState } from "react";
import { RECIPES } from "@/lib/recipes";
import {
  recommendMeals,
  applyFilter,
  signalsFromDaily,
  type ScoredMeal,
} from "@/lib/mealEngine";
import { logStaticRecipe, logFood, type MealType } from "@/lib/nutrition";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";
import type { DailySignals } from "@/lib/sharedSignals";
import type { Phase } from "@/lib/cycle";
import type { Food } from "@/lib/nutrition";
import RecipePreviewModal, { type RecipePreviewData } from "@/components/RecipePreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type UnifiedFilter = "all" | "bowls" | "wraps" | "high_protein" | "iron_rich";

type MealItem =
  | { kind: "static"; scored: ScoredMeal }
  | { kind: "food";   food: Food };

// ── Filter config ─────────────────────────────────────────────────────────────

const FILTERS: { id: UnifiedFilter; label: string }[] = [
  { id: "all",          label: "All"          },
  { id: "bowls",        label: "Bowls"        },
  { id: "wraps",        label: "Wraps"        },
  { id: "high_protein", label: "High Protein" },
  { id: "iron_rich",    label: "Iron-rich"    },
];

// ── Phase accent colour ───────────────────────────────────────────────────────

const PHASE_COLOR: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  phase:         Phase;
  dailySignals:  DailySignals | null;
  macroTargets?: { calories: number; protein: number; carbs: number; fats: number };
  cycleDay:      number;
  phaseFoods:    Food[];
  ironBoost?:    boolean;   // true when flow is medium or heavy
  onLogged?:     () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreMatchesFilter(scored: ScoredMeal, filter: UnifiedFilter, phase: Phase): boolean {
  const { recipe } = scored;
  if (filter === "all")          return true;
  if (filter === "bowls")        return recipe.type === "bowl";
  if (filter === "wraps")        return recipe.type === "wrap";
  if (filter === "high_protein") return recipe.functional_tags.includes("high_protein");
  if (filter === "iron_rich")    return recipe.functional_tags.includes("iron_rich") || phase === "menstrual";
  return true;
}

function foodMatchesFilter(food: Food, filter: UnifiedFilter, phase: Phase): boolean {
  if (filter === "all")          return true;
  if (filter === "bowls")        return false; // foods don't have type tags
  if (filter === "wraps")        return false;
  if (filter === "high_protein") return (food.protein ?? 0) >= 20;
  if (filter === "iron_rich")    return !!(food.keyNutrient?.toLowerCase().includes("iron")) || phase === "menstrual";
  return true;
}

function buildPreviewFromStatic(scored: ScoredMeal, phase: Phase): RecipePreviewData {
  const { recipe } = scored;
  return {
    id:          recipe.id,
    name:        recipe.name,
    phaseReason: scored.reasons[0] ?? undefined,
    ingredients: Object.entries(recipe.ingredients_grams).map(([item, g]) => `${item} (${g}g)`),
    steps:       recipe.instructions,
    kcal:        recipe.macros_per_serving.calories_kcal,
    protein:     recipe.macros_per_serving.protein_g,
    carbs:       recipe.macros_per_serving.carbs_g,
    fats:        recipe.macros_per_serving.fat_g,
    prepMin:     recipe.prep_time_min,
    difficulty:  recipe.difficulty,
    tags:        recipe.functional_tags,
  };
}

function buildPreviewFromFood(food: Food): RecipePreviewData {
  const detail = RECIPE_DETAILS[food.externalId ?? ""];
  return {
    id:          food.id ?? food.externalId ?? food.name,
    name:        food.name,
    phaseReason: detail?.phaseReason,
    ingredients: detail?.ingredients ?? [],
    steps:       detail?.steps ?? [],
    kcal:        Math.round(food.calories ?? 0),
    protein:     Math.round(food.protein  ?? 0),
    carbs:       Math.round(food.carbs    ?? 0),
    fats:        Math.round(food.fats     ?? 0),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UnifiedMealSection({
  phase,
  dailySignals,
  macroTargets,
  cycleDay,
  phaseFoods,
  ironBoost,
  onLogged,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<UnifiedFilter>(
    ironBoost ? "iron_rich" : "all"
  );
  const [previewItem, setPreviewItem] = useState<MealItem | null>(null);

  const color = PHASE_COLOR[phase];

  // Bridge signals for mealEngine
  const mealSignals = useMemo(
    () =>
      signalsFromDaily(
        dailySignals,
        macroTargets
          ? { calories_kcal: macroTargets.calories, protein_g: macroTargets.protein, carbs_g: macroTargets.carbs, fat_g: macroTargets.fats }
          : undefined,
      ),
    [dailySignals, macroTargets],
  );

  // Score static recipes (top 4)
  const scoredStatic = useMemo((): ScoredMeal[] => {
    return recommendMeals(RECIPES, mealSignals, 4);
  }, [mealSignals]);

  // Build combined item list, applying filter
  const items = useMemo((): MealItem[] => {
    const staticItems: MealItem[] = scoredStatic
      .filter(s => scoreMatchesFilter(s, activeFilter, phase))
      .map(s => ({ kind: "static" as const, scored: s }));

    const foodItems: MealItem[] = phaseFoods
      .filter(f => foodMatchesFilter(f, activeFilter, phase))
      .slice(0, 4)
      .map(f => ({ kind: "food" as const, food: f }));

    // Static first, then foods
    return [...staticItems, ...foodItems].slice(0, 8);
  }, [scoredStatic, phaseFoods, activeFilter, phase]);

  async function handleLogStatic(scored: ScoredMeal) {
    await logStaticRecipe(
      {
        name:      scored.recipe.name,
        calories:  scored.recipe.macros_per_serving.calories_kcal,
        protein_g: scored.recipe.macros_per_serving.protein_g,
        carbs_g:   scored.recipe.macros_per_serving.carbs_g,
        fat_g:     scored.recipe.macros_per_serving.fat_g,
      },
      "snack" as MealType,
      cycleDay,
      phase,
    );
    onLogged?.();
  }

  async function handleLogFood(food: Food) {
    await logFood(food, "snack" as MealType, cycleDay, phase);
    onLogged?.();
  }

  return (
    <>
      {/* Recipe preview modal */}
      {previewItem && (
        <RecipePreviewModal
          recipe={
            previewItem.kind === "static"
              ? buildPreviewFromStatic(previewItem.scored, phase)
              : buildPreviewFromFood(previewItem.food)
          }
          phaseColor={color}
          onClose={() => setPreviewItem(null)}
          onLog={async () => {
            if (previewItem.kind === "static") {
              await handleLogStatic(previewItem.scored);
            } else {
              await handleLogFood(previewItem.food);
            }
            setPreviewItem(null);
          }}
        />
      )}

      <div className="mb-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base font-semibold text-dark">
            {ironBoost ? "🩸 Iron-boost meals" : "Recommended for you"}
          </h2>
          <span className="text-xs font-body" style={{ color: `${color}bb` }}>
            Phase-scored
          </span>
        </div>

        {/* Filter pills */}
        <div
          className="flex gap-1.5 pb-2 mb-3"
          style={{ overflowX: "auto", scrollbarWidth: "none" }}
        >
          {FILTERS.map(f => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #C96480, #A84468)",
                        color: "white",
                        boxShadow: "0 3px 10px rgba(169,68,104,0.30)",
                      }
                    : {
                        background: "var(--color-ghost)",
                        color: "var(--color-text-mid)",
                        border: "1px solid var(--color-border)",
                      }
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Meal cards */}
        {items.length === 0 ? (
          <div
            className="rounded-2xl p-4 text-center text-sm text-dark/40 font-body"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            No meals match this filter for the {phase} phase.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, idx) => {
              const isTop = idx === 0;
              const name    = item.kind === "static" ? item.scored.recipe.name : item.food.name;
              const kcal    = item.kind === "static" ? item.scored.recipe.macros_per_serving.calories_kcal : Math.round(item.food.calories ?? 0);
              const protein = item.kind === "static" ? item.scored.recipe.macros_per_serving.protein_g    : Math.round(item.food.protein  ?? 0);
              const carbs   = item.kind === "static" ? item.scored.recipe.macros_per_serving.carbs_g      : Math.round(item.food.carbs    ?? 0);
              const fats    = item.kind === "static" ? item.scored.recipe.macros_per_serving.fat_g        : Math.round(item.food.fats     ?? 0);
              const reason  = item.kind === "static"
                ? (item.scored.reasons[0] ?? null)
                : (RECIPE_DETAILS[item.food.externalId ?? ""]?.phaseReason?.split(".")[0] ?? item.food.keyNutrient ?? null);
              const prepMin    = item.kind === "static" ? item.scored.recipe.prep_time_min : undefined;
              const difficulty = item.kind === "static" ? item.scored.recipe.difficulty    : undefined;

              return (
                <button
                  key={item.kind === "static" ? item.scored.recipe.id : (item.food.id ?? item.food.name)}
                  onClick={() => setPreviewItem(item)}
                  className="rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98]"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderTop: isTop ? `3px solid ${color}` : "1px solid var(--color-border)",
                    boxShadow: isTop ? `0 4px 16px ${color}22` : "none",
                  }}
                >
                  {/* Name + reason */}
                  <div className="px-4 pt-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display font-semibold text-sm text-dark leading-snug flex-1">
                        {name}
                      </p>
                      {isTop && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${color}18`, color: `${color}cc` }}
                        >
                          Top pick
                        </span>
                      )}
                    </div>
                    {reason && (
                      <p className="text-xs font-body mt-1 leading-snug" style={{ color: `${color}cc` }}>
                        {reason}
                      </p>
                    )}
                  </div>

                  {/* Macro strip */}
                  <div
                    className="mx-4 mb-3 px-3 py-2 rounded-xl grid grid-cols-4"
                    style={{ background: "var(--color-ghost)" }}
                  >
                    {[
                      { label: "kcal",    value: `${kcal}`     },
                      { label: "protein", value: `${protein}g` },
                      { label: "carbs",   value: `${carbs}g`   },
                      { label: "fat",     value: `${fats}g`    },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <p className="text-dark font-semibold text-xs">{m.value}</p>
                        <p className="text-[var(--color-text-dim)] text-[10px] mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer: time + tap cue */}
                  <div className="px-4 pb-3.5 flex items-center justify-between">
                    <span className="text-xs font-body text-dark/30">
                      {prepMin ? `${prepMin} min · ${difficulty}` : "Tap to see recipe"}
                    </span>
                    <span className="text-xs font-semibold" style={{ color }}>
                      View recipe →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Check that `logFood` exists in lib/nutrition — grep for it**

```bash
grep -n "export.*logFood\|function logFood" /c/Users/Wirra89/Downloads/herphase/lib/nutrition.ts | head -5
```

If `logFood` does not exist, use `logStaticRecipe` with the food's macro fields for both kinds (adjust the handleLogFood call accordingly before committing). The function signature is:
```typescript
await logStaticRecipe(
  { name: food.name, calories: food.calories, protein_g: food.protein, carbs_g: food.carbs, fat_g: food.fats },
  "snack" as MealType, cycleDay, phase
);
```

- [ ] **Step 3: Fix import if logFood missing**

If `logFood` doesn't exist, change the import in UnifiedMealSection.tsx:
```tsx
import { logStaticRecipe, type MealType } from "@/lib/nutrition";
```
And replace `handleLogFood`:
```tsx
async function handleLogFood(food: Food) {
  await logStaticRecipe(
    { name: food.name, calories: food.calories ?? 0, protein_g: food.protein ?? 0, carbs_g: food.carbs ?? 0, fat_g: food.fats ?? 0 },
    "snack" as MealType, cycleDay, phase,
  );
  onLogged?.();
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add components/UnifiedMealSection.tsx
git commit -m "feat: add UnifiedMealSection — merged static + food recommendations with filter pills and modal-gated logging"
```

---

## Task 3: Wire UnifiedMealSection into meals/page.tsx

**Files:**
- Modify: `app/meals/page.tsx`

Replace both `<RecipeRecommendationPanel>` and `<MealRecommendationCards>` with `<UnifiedMealSection>`. Keep `<NutritionFoodSearch>` above it (already in position). Remove imports for the two old components.

- [ ] **Step 1: Read current meals/page.tsx imports and component usage**

Already done — we know the exact lines. Proceed.

- [ ] **Step 2: Update meals/page.tsx**

Remove these imports:
```tsx
import MealRecommendationCards      from "@/components/MealRecommendationCards";
import RecipeRecommendationPanel    from "@/components/RecipeRecommendationPanel";
```

Add:
```tsx
import UnifiedMealSection from "@/components/UnifiedMealSection";
```

Replace the block starting `{!showNutritionSearch ? (` through `</MealRecommendationCards>` with:

```tsx
{/* Search & log food */}
<div className="mb-3">
  {!showNutritionSearch ? (
    <button
      onClick={() => setShowNutritionSearch(true)}
      className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all duration-300 active:scale-95 mb-3 flex items-center justify-center gap-2 shadow-soft"
      style={{ background: "linear-gradient(135deg, #C96480, #A84468)" }}>
      <span className="text-base">🔍</span>
      Search & log food
    </button>
  ) : (
    <NutritionFoodSearch
      cycleDay={cycleDay}
      phase={phase}
      onLogged={() => {
        setShowNutritionSearch(false);
        showToast("✓ Food logged");
        refreshNutrition();
      }}
      onCancel={() => setShowNutritionSearch(false)}
    />
  )}

  <NutritionEntryList
    entries={nutritionEntries}
    summary={nutritionSummary}
    loading={nutritionLoading}
    macroTargets={macroTargets}
    macroRemaining={macroRemaining}
    phase={phase}
    phaseFoods={phaseFoods}
    userGoals={profile?.goals ?? []}
    mealFocusHeadline={todayState?.mealFocus?.headline ?? null}
    cycleDay={cycleDay}
    onLogged={() => { showToast("✓ Food logged"); refreshNutrition(); }}
    onEntryDeleted={(deletedId) => {
      setNutritionEntries(prev => prev.filter(e => e.id !== deletedId));
      refreshNutrition();
    }}
  />
</div>

{/* Unified phase-aware meal recommendations */}
<UnifiedMealSection
  phase={phase}
  dailySignals={dailySignals}
  macroTargets={macroTargets}
  cycleDay={cycleDay}
  phaseFoods={phaseFoods}
  onLogged={() => {
    showToast("✓ Meal logged");
    refreshNutrition();
  }}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/meals/page.tsx
git commit -m "feat: replace dual recipe panels with UnifiedMealSection on meals page"
```

---

## Task 4: Remove duplicate food IDs from lib/foods.ts (P2)

**Files:**
- Modify: `lib/foods.ts`

Migration 005 uses `ON CONFLICT (external_id) DO NOTHING` — any food whose `external_id` appears twice in foods.ts has only its FIRST entry in the DB. The second entries are dead code. Remove them.

- [ ] **Step 1: Find the duplicate sections**

```bash
grep -n "externalId:" /c/Users/Wirra89/Downloads/herphase/lib/foods.ts | awk -F'"' '{print $2}' | sort | uniq -d
```

This prints every externalId that appears more than once.

- [ ] **Step 2: Find line numbers of duplicates**

```bash
grep -n "externalId:" /c/Users/Wirra89/Downloads/herphase/lib/foods.ts | grep -E "men-11|men-12|men-14|men-15|fol-11|fol-12|fol-13|fol-14|fol-15|fol-16|ovu-10|ovu-11|ovu-12|lut-11|lut-12|lut-13|lut-14|lut-15|lut-16|lut-17"
```

For each duplicate ID, the SECOND occurrence (higher line number) is the one to remove along with its surrounding `{ ... },` block.

- [ ] **Step 3: Delete each second-occurrence block**

Open `lib/foods.ts` and for each duplicate ID, delete the entire object `{ id: ..., externalId: "men-11", ... },` at its second (higher) line number. Delete from the `{` to the matching `},` inclusive.

Duplicate IDs to remove second occurrences of (verify against step 1 output first):
`men-11`, `men-12`, `men-14`, `men-15`, `fol-11`, `fol-12`, `fol-13`, `fol-14`, `fol-15`, `fol-16`, `ovu-10`, `ovu-11`, `ovu-12`, `lut-11`, `lut-12`, `lut-13`, `lut-14`, `lut-15`, `lut-16`, `lut-17`

- [ ] **Step 4: Verify no duplicates remain**

```bash
grep -n "externalId:" /c/Users/Wirra89/Downloads/herphase/lib/foods.ts | awk -F'"' '{print $2}' | sort | uniq -d
```

Expected: empty output (no duplicates).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add lib/foods.ts
git commit -m "fix: remove dead duplicate food IDs from lib/foods.ts — second batch was silently skipped by migration 005"
```

---

## Task 5: Add period flow tracking — migration + saveMoodLog (P3)

**Files:**
- Create: `supabase/migrations/014_flow_intensity.sql`
- Modify: `lib/supabase.ts`
- Modify: `lib/dailyPlan.ts`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/014_flow_intensity.sql
-- Adds optional flow intensity tracking to mood_logs.
-- Only populated during menstrual phase. NULL = not in period or not tracked.

ALTER TABLE mood_logs
  ADD COLUMN IF NOT EXISTS flow_intensity TEXT
  CONSTRAINT flow_intensity_values CHECK (
    flow_intensity IS NULL OR
    flow_intensity IN ('spotting', 'light', 'medium', 'heavy')
  );
```

- [ ] **Step 2: Apply migration to Supabase**

Use the Supabase MCP tool to apply the migration, OR run:
```bash
# If using Supabase CLI:
cd /c/Users/Wirra89/Downloads/herphase && npx supabase db push
```

Verify the column exists by running in Supabase SQL editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mood_logs' AND column_name = 'flow_intensity';
```

Expected: 1 row returned.

- [ ] **Step 3: Add flow_intensity to CheckInSnapshot in lib/dailyPlan.ts**

Find (around line 12):
```typescript
export interface CheckInSnapshot {
  mood: number;
  energy: number;
  symptoms: string[];
  sleep_hours?: number;
  sleep_quality?: number;
  cravings?: string[];
}
```

Replace with:
```typescript
export type FlowIntensity = "spotting" | "light" | "medium" | "heavy";

export interface CheckInSnapshot {
  mood: number;
  energy: number;
  symptoms: string[];
  sleep_hours?: number;
  sleep_quality?: number;
  cravings?: string[];
  flow_intensity?: FlowIntensity | null;
}
```

- [ ] **Step 4: Apply heavy flow penalty in calcReadinessScore**

Find in `lib/dailyPlan.ts` (around line 139 after the symptom penalty block):
```typescript
  const penalty = Math.min(
```

After the entire `penalty` and weighted sum block, before the `return Math.round(...)` line, add:

```typescript
  // Heavy flow reduces readiness by an additional 10 points
  const flowPenalty = checkin.flow_intensity === "heavy" ? 10 : 0;
```

Then subtract it in the return:
```typescript
  return Math.max(0, Math.min(100, Math.round(weighted - penalty - flowPenalty)));
```

(Find the existing `return Math.max(0, Math.min(100, ...))` line and add `- flowPenalty` there.)

- [ ] **Step 5: Add flow_intensity to saveMoodLog in lib/supabase.ts**

Find the `saveMoodLog` function. Add `flow_intensity?: string | null` to its params interface/type and include it in the upsert payload:

```typescript
export async function saveMoodLog(params: {
  date: string;
  mood: number;
  energy: number;
  phase: string;
  cycle_day: number;
  symptoms?: string[];
  cravings?: string[];
  sleep_hours?: number | null;
  sleep_quality?: number | null;
  note?: string | null;
  flow_intensity?: string | null;   // ADD THIS
}) {
```

In the upsert object, add:
```typescript
  flow_intensity: params.flow_intensity ?? null,
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/014_flow_intensity.sql lib/supabase.ts lib/dailyPlan.ts
git commit -m "feat: add flow_intensity to mood_logs + CheckInSnapshot + readiness penalty for heavy flow"
```

---

## Task 6: Add flow intensity picker to mood/check-in page (P3 continued)

**Files:**
- Modify: `app/mood/page.tsx`

The flow intensity picker appears only when `phase === "menstrual"`. It is a horizontal row of 4 buttons: Spotting / Light / Medium / Heavy. It sits between the symptom chips and the sleep section (or at the bottom of the form before the submit button — wherever fits naturally).

- [ ] **Step 1: Add flow state to mood/page.tsx**

Find the existing state declarations. Add:
```tsx
const [flowIntensity, setFlowIntensity] = useState<"spotting" | "light" | "medium" | "heavy" | null>(null);
```

Also reset it when navigating away or after submit (wherever mood state is reset after save).

- [ ] **Step 2: Add the picker JSX**

Find where the symptom section is rendered (look for `phaseSymptoms` usage). After the symptom chips section and before the sleep section, add:

```tsx
{/* Flow intensity — menstrual phase only */}
{phase === "menstrual" && (
  <div className="mb-4">
    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">
      Flow intensity
    </p>
    <div className="grid grid-cols-4 gap-1.5">
      {(["spotting", "light", "medium", "heavy"] as const).map(level => {
        const isActive = flowIntensity === level;
        const labels: Record<string, string> = {
          spotting: "Spotting",
          light:    "Light",
          medium:   "Medium",
          heavy:    "Heavy",
        };
        return (
          <button
            key={level}
            onClick={() => setFlowIntensity(isActive ? null : level)}
            className="py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: isActive ? "#F8717120" : "var(--color-surface)",
              color: isActive ? "#F87171" : "var(--color-text-dim)",
              border: `1px solid ${isActive ? "#F8717144" : "var(--color-border)"}`,
            }}
          >
            {labels[level]}
          </button>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Pass flow_intensity to saveMoodLog**

Find the `saveMoodLog(...)` call. Add `flow_intensity: flowIntensity` to the params object.

- [ ] **Step 4: Pass flow_intensity into CheckInSnapshot for dailyPlan**

If the mood page or AppContext feeds check-in data into `buildTodayState`, add `flow_intensity: flowIntensity ?? undefined` to the CheckInSnapshot there.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add app/mood/page.tsx
git commit -m "feat: add flow intensity picker to mood page (menstrual phase only)"
```

---

## Task 7: Wire iron boost from flow intensity into UnifiedMealSection (P3 continued)

**Files:**
- Modify: `app/meals/page.tsx`
- Modify: `context/AppContext.tsx` (if flow_intensity is not already in latestMoodLog)

When `flow_intensity` is "medium" or "heavy", pass `ironBoost={true}` to UnifiedMealSection so it defaults to the "Iron-rich" filter and shows the banner headline.

- [ ] **Step 1: Check what latestMoodLog exposes in AppContext**

```bash
grep -n "latestMoodLog\|flow_intensity" /c/Users/Wirra89/Downloads/herphase/context/AppContext.tsx | head -20
```

- [ ] **Step 2: If flow_intensity is in latestMoodLog, derive ironBoost in meals/page.tsx**

```tsx
const flowIntensity = (latestMoodLog as { flow_intensity?: string } | null)?.flow_intensity;
const ironBoost = flowIntensity === "medium" || flowIntensity === "heavy";
```

Pass to component:
```tsx
<UnifiedMealSection
  ...
  ironBoost={ironBoost}
  ...
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/meals/page.tsx context/AppContext.tsx
git commit -m "feat: pass ironBoost flag to UnifiedMealSection when flow is medium or heavy"
```

---

## Task 8: Add SleepChart component (P4)

**Files:**
- Create: `components/SleepChart.tsx`

SVG bar chart. X-axis: up to 28 most recent mood logs (each a bar). Y-axis: sleep_hours (0–10). Bars colored by phase. Overlay dots for sleep quality (1–5 mapped to y position within bar). Only renders when at least 3 data points exist.

- [ ] **Step 1: Create SleepChart.tsx**

```tsx
"use client";

// components/SleepChart.tsx
// Sleep hours bars colored by phase, with quality dot overlay.

const PHASE_COLOR: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

interface SleepEntry {
  date: string;
  phase: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
}

interface Props {
  entries: SleepEntry[];
}

export default function SleepChart({ entries }: Props) {
  const data = entries
    .filter(e => e.sleep_hours != null && e.sleep_hours > 0)
    .slice(-28);

  if (data.length < 3) {
    return (
      <div className="rounded-2xl p-4 text-center text-xs font-body text-[var(--color-text-dim)]"
        style={{ background: "var(--color-surface)" }}>
        Log sleep in at least 3 check-ins to see your sleep chart.
      </div>
    );
  }

  const MAX_H = 10;
  const CHART_H = 80;  // px
  const BAR_W = Math.max(4, Math.min(16, Math.floor(280 / data.length) - 2));
  const GAP   = 2;
  const totalW = data.length * (BAR_W + GAP);

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${CHART_H + 16}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {data.map((entry, i) => {
          const h     = entry.sleep_hours ?? 0;
          const barH  = Math.max(4, (h / MAX_H) * CHART_H);
          const x     = i * (BAR_W + GAP);
          const y     = CHART_H - barH;
          const color = PHASE_COLOR[entry.phase] ?? "#C48A97";

          // Quality dot position: 1-5 → bottom → top of bar
          const qual    = entry.sleep_quality;
          const dotY    = qual != null
            ? y + barH - ((qual - 1) / 4) * barH
            : null;

          return (
            <g key={i}>
              {/* Sleep hours bar */}
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                rx={2}
                fill={color}
                opacity={0.7}
              />
              {/* Quality dot */}
              {dotY != null && (
                <circle
                  cx={x + BAR_W / 2}
                  cy={dotY}
                  r={BAR_W > 8 ? 3 : 2}
                  fill="white"
                  opacity={0.9}
                />
              )}
            </g>
          );
        })}

        {/* 7h optimal line */}
        <line
          x1={0}
          y1={CHART_H - (7 / MAX_H) * CHART_H}
          x2={totalW}
          y2={CHART_H - (7 / MAX_H) * CHART_H}
          stroke="#34D39955"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {Object.entries(PHASE_COLOR).map(([phase, color]) => (
          <span key={phase} className="flex items-center gap-1 text-xs text-[var(--color-text-dim)]">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color, opacity: 0.7 }} />
            {phase.charAt(0).toUpperCase() + phase.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs text-[var(--color-text-dim)]">
          <span className="w-2 h-2 rounded-full inline-block bg-white border border-gray-300" />
          Quality
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add SleepChart to Insights page (mood tab)**

In `app/insights/page.tsx`, import SleepChart:
```tsx
import SleepChart from "@/components/SleepChart";
```

In the mood tab JSX (find `activeTab === "mood"`), after the existing mood bar chart, add:
```tsx
{/* Sleep chart */}
{moods.length >= 3 && (
  <div
    className="rounded-2xl shadow-card p-4 mb-3"
    style={{ background: "var(--color-surface)" }}
  >
    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">
      Sleep hours by cycle phase
    </p>
    <SleepChart
      entries={moods.map(m => ({
        date:          m.date as string,
        phase:         m.phase as string,
        sleep_hours:   (m.sleep_hours as unknown as number | null) ?? null,
        sleep_quality: (m.sleep_quality as unknown as number | null) ?? null,
      }))}
    />
    <div className="flex justify-between mt-2">
      <span className="text-xs text-dark/30">Oldest</span>
      <span className="text-xs text-dark/30">Most recent</span>
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/SleepChart.tsx app/insights/page.tsx
git commit -m "feat: add SleepChart component to Insights mood tab"
```

---

## Task 9: Add WeeklySummaryCard (P5)

**Files:**
- Create: `components/WeeklySummaryCard.tsx`
- Modify: `app/dashboard/page.tsx`

Fetches data for Mon–Sun of current week. Shows: workouts, meals logged, avg mood (1–5), weight trend (↑/↓/→), best PR of the week. Shows only when user has at least 1 data point for the week.

- [ ] **Step 1: Create WeeklySummaryCard.tsx**

```tsx
"use client";

// components/WeeklySummaryCard.tsx
// Shows a Mon-Sun summary of the user's activity.
// Data fetched internally; no props beyond user dependency signal.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";

interface WeekSummary {
  workouts:   number;
  meals:      number;
  avgMood:    number | null;
  weightTrend: "up" | "down" | "stable" | null;
  bestPR:     { exercise: string; weight: number } | null;
}

function getMondayAndSunday(): { monday: string; sunday: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { monday: fmt(monday), sunday: fmt(sunday) };
}

export default function WeeklySummaryCard() {
  const { user } = useApp();
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const { monday, sunday } = getMondayAndSunday();

    Promise.all([
      // Workouts this week
      supabase.from("workouts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monday)
        .lte("created_at", sunday + "T23:59:59"),
      // Meals this week
      supabase.from("meal_log_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("logged_at", monday)
        .lte("logged_at", sunday + "T23:59:59"),
      // Mood logs this week
      supabase.from("mood_logs")
        .select("mood")
        .eq("user_id", user.id)
        .gte("date", monday)
        .lte("date", sunday),
      // Weight logs this week
      supabase.from("weight_logs")
        .select("weight_kg,date")
        .eq("user_id", user.id)
        .gte("date", monday)
        .lte("date", sunday)
        .order("date", { ascending: true }),
      // PRs this week
      supabase.from("personal_records")
        .select("exercise_name,weight_kg")
        .eq("user_id", user.id)
        .gte("logged_at", monday)
        .lte("logged_at", sunday + "T23:59:59")
        .order("weight_kg", { ascending: false })
        .limit(1),
    ]).then(([w, m, mo, wt, pr]) => {
      const moodData  = (mo.data ?? []) as { mood: unknown }[];
      const avgMood   = moodData.length
        ? moodData.reduce((a, x) => a + Number(x.mood), 0) / moodData.length
        : null;

      const wtData = (wt.data ?? []) as { weight_kg: number }[];
      let weightTrend: WeekSummary["weightTrend"] = null;
      if (wtData.length >= 2) {
        const diff = wtData[wtData.length - 1].weight_kg - wtData[0].weight_kg;
        weightTrend = diff > 0.2 ? "up" : diff < -0.2 ? "down" : "stable";
      }

      const prData = (pr.data ?? []) as { exercise_name: string; weight_kg: number }[];
      const bestPR = prData[0]
        ? { exercise: prData[0].exercise_name, weight: prData[0].weight_kg }
        : null;

      setSummary({
        workouts:    w.count ?? 0,
        meals:       m.count ?? 0,
        avgMood,
        weightTrend,
        bestPR,
      });
      setLoading(false);
    });
  }, [user]);

  if (loading || !summary) return null;

  const hasAnyData = summary.workouts > 0 || summary.meals > 0 || summary.avgMood !== null;
  if (!hasAnyData) return null;

  const MOOD_EMOJI = ["", "😣", "😔", "😐", "🙂", "😄"];
  const TREND_ICON: Record<string, string> = { up: "↑", down: "↓", stable: "→" };
  const TREND_COLOR: Record<string, string> = { up: "#F87171", down: "#34D399", stable: "#A78BFA" };

  const { monday } = getMondayAndSunday();
  const weekStart = new Date(monday).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div
      className="rounded-2xl p-4 mb-4 shadow-card"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-3">
        Week from {weekStart}
      </p>
      <div className="grid grid-cols-2 gap-2">

        <Tile emoji="🏋️‍♀️" label="Workouts" value={summary.workouts > 0 ? `${summary.workouts}` : "—"} />
        <Tile emoji="🥗" label="Meals logged" value={summary.meals > 0 ? `${summary.meals}` : "—"} />

        {summary.avgMood !== null && (
          <Tile
            emoji={MOOD_EMOJI[Math.round(summary.avgMood)] ?? "😐"}
            label="Avg mood"
            value={summary.avgMood.toFixed(1)}
          />
        )}

        {summary.weightTrend && (
          <Tile
            emoji={TREND_ICON[summary.weightTrend]}
            emojiColor={TREND_COLOR[summary.weightTrend]}
            label="Weight"
            value={summary.weightTrend.charAt(0).toUpperCase() + summary.weightTrend.slice(1)}
          />
        )}

        {summary.bestPR && (
          <div
            className="col-span-2 rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: "rgba(251,191,36,0.10)" }}
          >
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-xs font-semibold text-dark">Best PR this week</p>
              <p className="text-xs font-body text-dark/50">
                {summary.bestPR.exercise} — {summary.bestPR.weight} kg
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ emoji, emojiColor, label, value }: { emoji: string; emojiColor?: string; label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{ background: "var(--color-ghost)" }}
    >
      <p className="text-base mb-0.5" style={{ color: emojiColor }}>{emoji}</p>
      <p className="text-sm font-semibold text-dark">{value}</p>
      <p className="text-xs text-dark/40">{label}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify personal_records table name**

```bash
grep -rn "personal_records\|personalRecord\|PRs" /c/Users/Wirra89/Downloads/herphase/lib/supabase.ts | head -10
```

If the table is named differently (e.g. `prs`), update the query in Step 1 accordingly before committing.

- [ ] **Step 3: Add WeeklySummaryCard to dashboard/page.tsx**

Import:
```tsx
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
```

In the JSX, after `<NutritionCard ...>` (find it by its component name), add:
```tsx
<WeeklySummaryCard />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add components/WeeklySummaryCard.tsx app/dashboard/page.tsx
git commit -m "feat: add WeeklySummaryCard to Dashboard showing Mon-Sun activity summary"
```

---

## Task 10: Add symptom pattern insight cards (P6)

**Files:**
- Modify: `app/insights/page.tsx`

The Insights page already computes `symptomsByPhase`. This task surfaces the top patterns as insight cards in the mood tab when `moods.length >= 28`.

- [ ] **Step 1: Read the existing symptomsByPhase computation**

```bash
grep -n "symptomsByPhase\|freq\[" /c/Users/Wirra89/Downloads/herphase/app/insights/page.tsx | head -20
```

Understand the shape: it produces an array of `{ phase, topSymptoms: string[], count: number }` or similar.

- [ ] **Step 2: Derive pattern cards from symptomsByPhase**

After the existing `symptomsByPhase` computation, add:

```tsx
// Symptom patterns: symptoms appearing in >50% of logs for a given phase
const symptomPatterns: { phase: string; symptom: string; pct: number }[] = [];
if (moods.length >= 28) {
  symptomsByPhase.forEach(({ phase, topSymptoms, count }) => {
    const phaseLogs = moods.filter(m => m.phase === phase);
    if (phaseLogs.length < 5) return; // need enough data for this phase
    topSymptoms.forEach((symptom: string) => {
      const freq = phaseLogs.filter(m => {
        const syms = m.symptoms as unknown as string[];
        return syms && syms.includes(symptom);
      }).length;
      const pct = freq / phaseLogs.length;
      if (pct >= 0.5) {
        symptomPatterns.push({ phase, symptom, pct: Math.round(pct * 100) });
      }
    });
  });
}
```

Note: if `symptomsByPhase` has a different shape, adjust the forEach body to match. The key goal is to find symptoms with >50% frequency per phase.

- [ ] **Step 3: Render pattern cards in the mood tab**

In the mood tab JSX, after the sleep chart block, add:

```tsx
{/* Symptom pattern insights — personalized stage only */}
{maturity === "personalized" && symptomPatterns.length > 0 && (
  <div className="mb-3">
    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">
      Your patterns
    </p>
    <div className="space-y-2">
      {symptomPatterns.slice(0, 6).map(({ phase, symptom, pct }) => {
        const color = { menstrual: "#F87171", follicular: "#34D399", ovulation: "#FBBF24", luteal: "#A78BFA" }[phase] ?? "#C48A97";
        return (
          <div
            key={`${phase}-${symptom}`}
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: `${color}18`, color }}
            >
              ✦
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">
                You often report{" "}
                <span style={{ color }}>{symptom}</span>
              </p>
              <p className="text-xs font-body text-dark/40 mt-0.5">
                in your {phase} phase · {pct}% of check-ins
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/insights/page.tsx
git commit -m "feat: add symptom pattern insight cards to Insights mood tab (personalized stage, 28+ logs)"
```

---

## Task 11: Deploy

- [ ] **Step 1: Final TypeScript check**

```bash
cd /c/Users/Wirra89/Downloads/herphase && npx tsc --noEmit 2>&1 | grep -v "node_modules"
```

Expected: 0 errors.

- [ ] **Step 2: Deploy to Vercel**

Use the Vercel MCP tool (`deploy_to_vercel`) or:
```bash
cd /c/Users/Wirra89/Downloads/herphase && npx vercel --prod
```

- [ ] **Step 3: Smoke test in browser**

- Meals page: tap a meal card → RecipePreviewModal opens → log button works → toast fires → modal closes
- Meals page: filter pills change the visible cards
- Mood page: menstrual phase shows flow intensity picker; saving includes the value
- Dashboard: WeeklySummaryCard visible when week has data
- Insights → mood tab: SleepChart visible when 3+ sleep logs exist; pattern cards at 28+ logs

---

## Self-Review Checklist

**Spec coverage:**
- P1 Merge recipe UI → Tasks 1, 2, 3 ✓
- P2 Duplicate food IDs → Task 4 ✓
- P2 History migration → History already reads `meal_log_entries` in current code (confirmed in session) — no task needed ✓
- P3 Flow tracking → Tasks 5, 6, 7 ✓
- P4 Sleep chart → Task 8 ✓
- P5 Weekly summary → Task 9 ✓
- P6 Symptom pattern → Task 10 ✓

**Key invariants:**
- Logging from modal only — cards have no log button ✓
- Modal z-index is z-[60] (above BottomNav z-50) ✓
- `flow_intensity` column is nullable — old rows unaffected ✓
- Symptom patterns only shown at `personalized` maturity (28+ logs) ✓
- WeeklySummaryCard returns null when no data — no empty card shown ✓
