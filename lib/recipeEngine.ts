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
  low_mood:  ["mood_support", "magnesium_support"],
};

const CRAVING_TAG_MAP: Record<string, string[]> = {
  sweet:     ["magnesium_support"],
  chocolate: ["magnesium_support"],
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
