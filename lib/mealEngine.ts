// lib/mealEngine.ts
// Scoring engine for the static bowl/wrap recipe dataset.
// Bridges DailySignals (from AppContext) to recipe recommendations.
// Pure functions — no DB calls, no side effects.

import type { Phase } from "@/lib/cycle";
import type { DailySignals } from "@/lib/sharedSignals";
import type { MealRecipe, MealGoal, MealTiming } from "@/lib/recipes";

// ── Signals contract ──────────────────────────────────────────────────────────

export interface MealSignals {
  phase:        Phase;
  symptoms:     string[];
  energy:       "low" | "medium" | "high" | null;
  goal:         MealGoal | null;
  timing:       MealTiming | null;
  macroTargets?: Partial<{
    calories_kcal: number;
    protein_g:     number;
    carbs_g:       number;
    fat_g:         number;
  }>;
}

// ── Scored result ─────────────────────────────────────────────────────────────

export interface ScoredMeal {
  recipe:  MealRecipe;
  score:   number;
  reasons: string[];         // up to 3 human-readable reason strings
}

// ── Signal adapter ────────────────────────────────────────────────────────────

/**
 * Maps 1–5 energy scale to low/medium/high.
 */
function mapEnergyLevel(energy: number | null): "low" | "medium" | "high" | null {
  if (energy === null) return null;
  if (energy <= 2) return "low";
  if (energy === 3) return "medium";
  return "high";
}

/**
 * Derives meal timing from readiness + bias signals.
 * Used as a soft scoring hint, not a hard filter.
 */
function deriveTiming(signals: DailySignals): MealTiming | null {
  if (signals.readinessLabel === "rest") return "rest_day";
  if (signals.biasTone === "push")       return "pre_workout";
  return null;
}

/**
 * Maps a profile goal string to a MealGoal.
 */
function mapGoal(goal: string | null): MealGoal | null {
  const MAP: Record<string, MealGoal> = {
    fat_loss:    "fat_loss",
    recomp:      "recomp",
    muscle_gain: "muscle_gain",
    maintenance: "maintenance",
  };
  return goal ? (MAP[goal] ?? null) : null;
}

/**
 * Converts AppContext DailySignals to MealSignals used by this engine.
 * Fallback-safe: handles null in every field.
 */
export function signalsFromDaily(
  daily: DailySignals | null,
  macroTargets?: MealSignals["macroTargets"],
): MealSignals {
  if (!daily) {
    return { phase: "follicular", symptoms: [], energy: null, goal: null, timing: null };
  }
  return {
    phase:        daily.phase,
    symptoms:     daily.symptomFlags,
    energy:       mapEnergyLevel(daily.energy),
    goal:         mapGoal(daily.primaryGoal),
    timing:       deriveTiming(daily),
    macroTargets,
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function closeEnough(actual: number, target: number | undefined, tolerance = 0.25): number {
  if (!target || target <= 0) return 0;
  const diff = Math.abs(actual - target) / target;
  return Math.max(0, 1 - diff / tolerance);
}

/**
 * Scores a recipe against the provided signals.
 * Returns null when the recipe does not support the current phase (hard exclude).
 */
export function scoreRecipe(recipe: MealRecipe, signals: MealSignals): ScoredMeal | null {
  if (!recipe.phase_support.includes(signals.phase)) return null;

  let score = 0;
  const reasons: string[] = [];

  // Phase match — always granted after hard-include check
  score += 30;

  // Symptom support (+8 each, cap 24)
  const symptomHits = signals.symptoms.filter(s => recipe.symptom_support.includes(s));
  if (symptomHits.length) {
    score += Math.min(24, symptomHits.length * 8);
    reasons.push("Supports your symptoms today");
  }

  // Energy match (+12)
  if (signals.energy && recipe.attributes.energy_level === signals.energy) {
    score += 12;
    reasons.push(`Good for ${signals.energy} energy day`);
  }

  // Goal match (+10)
  if (signals.goal && recipe.goal_support.includes(signals.goal)) {
    score += 10;
    reasons.push(`Fits ${signals.goal.replace(/_/g, " ")}`);
  }

  // Timing match (+10)
  if (signals.timing && recipe.best_timing.includes(signals.timing)) {
    score += 10;
    reasons.push(`Good for ${signals.timing.replace(/_/g, " ")}`);
  }

  // Macro proximity (+up to 20)
  if (signals.macroTargets) {
    const t = signals.macroTargets;
    const m = recipe.macros_per_serving;
    const macroScore =
      closeEnough(m.calories_kcal, t.calories_kcal) * 8 +
      closeEnough(m.protein_g,     t.protein_g)     * 6 +
      closeEnough(m.carbs_g,       t.carbs_g)       * 3 +
      closeEnough(m.fat_g,         t.fat_g)         * 3;
    score += Math.round(macroScore);
  }

  // Meal prep bonus (+5) — great for batch-cooking users
  if (recipe.attributes.meal_prep_score >= 4) score += 5;

  // Fallback reason when no specific match was found
  if (reasons.length === 0) {
    reasons.push(`Phase-matched ${recipe.type}`);
  }

  return { recipe, score, reasons: reasons.slice(0, 3) };
}

// ── Filter helpers ────────────────────────────────────────────────────────────

export type RecipeFilter =
  | "all"
  | "bowls"
  | "wraps"
  | "high_protein"
  | "post_workout"
  | "low_appetite"
  | "meal_prep";

export function applyFilter(recipes: MealRecipe[], filter: RecipeFilter): MealRecipe[] {
  switch (filter) {
    case "bowls":       return recipes.filter(r => r.type === "bowl");
    case "wraps":       return recipes.filter(r => r.type === "wrap");
    case "high_protein":
      return recipes.filter(r =>
        r.functional_tags.includes("high_protein") ||
        r.functional_tags.includes("very_high_protein"),
      );
    case "post_workout": return recipes.filter(r => r.best_timing.includes("post_workout"));
    case "low_appetite":
      return recipes.filter(r =>
        r.attributes.digestion === "light" ||
        r.functional_tags.includes("light") ||
        r.attributes.energy_level === "low",
      );
    case "meal_prep":    return recipes.filter(r => r.attributes.meal_prep_score >= 4);
    default:             return recipes;
  }
}

// ── Recommendation ────────────────────────────────────────────────────────────

/**
 * Returns the top N scored recipes from a pool, ordered by score descending.
 */
export function recommendMeals(
  recipes: MealRecipe[],
  signals: MealSignals,
  limit = 3,
): ScoredMeal[] {
  return recipes
    .map(r => scoreRecipe(r, signals))
    .filter((r): r is ScoredMeal => r !== null)
    .sort((a, b) => b.score - a.score || a.recipe.prep_time_min - b.recipe.prep_time_min)
    .slice(0, limit);
}
