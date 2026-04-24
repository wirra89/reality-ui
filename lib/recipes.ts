// lib/recipes.ts
// Static recipe knowledge base — 70 bowl/wrap recipes.
// Imported as JSON (resolveJsonModule: true) — no Supabase dependency.

import type { Phase } from "@/lib/cycle";
import RAW_RECIPES from "@/lib/data/bowls_wraps.json";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MealGoal    = "fat_loss" | "recomp" | "muscle_gain" | "maintenance";
export type MealTiming  = "pre_workout" | "post_workout" | "rest_day" | "dinner" | "late_meal" | "low_carb_day" | "anytime";

export interface MealRecipe {
  id:             string;
  name:           string;
  type:           "bowl" | "wrap";
  servings:       number;
  prep_time_min:  number;
  difficulty:     "easy" | "medium" | "hard";
  protein_source: string;
  ingredients_grams: Record<string, number>;
  instructions:   string[];
  macros_per_serving: {
    calories_kcal: number;
    protein_g:     number;
    carbs_g:       number;
    fat_g:         number;
  };
  tags:           string[];
  phase_support:  Phase[];
  goal_support:   MealGoal[];
  functional_tags: string[];
  best_timing:    MealTiming[];
  symptom_support: string[];
  attributes: {
    energy_level:    "low" | "medium" | "high";
    digestion:       "light" | "medium" | "heavy";
    satiety:         "low" | "medium" | "medium_high" | "high";
    comfort_level:   "low" | "medium" | "high";
    meal_prep_score: number;
    prep_complexity: "simple" | "moderate" | "complex";
  };
  scaling: {
    scalable: boolean;
    base_serving_multiplier: number;
    primary_scalers_grams: { protein: string[]; carbs: string[]; fat: string[] };
    macro_adjustment_rules: string[];
  };
}

// ── Phase normalisation ───────────────────────────────────────────────────────
// JSON uses "ovulatory" and "all"; the app uses "ovulation".

const ALL_PHASES: Phase[] = ["menstrual", "follicular", "ovulation", "luteal"];

function normalisePhases(raw: string[]): Phase[] {
  if (raw.includes("all")) return ALL_PHASES;
  return raw.map(p => (p === "ovulatory" ? "ovulation" : p) as Phase);
}

// ── Data mapping ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecipe(raw: any): MealRecipe {
  return {
    ...raw,
    phase_support: normalisePhases(raw.phase_support as string[]),
  } as MealRecipe;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RECIPES: MealRecipe[] = (RAW_RECIPES as any[]).map(mapRecipe);
