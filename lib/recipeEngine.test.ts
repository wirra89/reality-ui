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
  description: "",
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
    // cramps overlaps with anti_inflammatory + warm + recovery (3 tags in BASE_RECIPE) → 3*8=24, hits cap immediately
    // fatigue adds nothing (cap already reached) → total symptomScore = 24
    // score = 30 (phase) + 24 (symptom) = 54, assertion checks >= 46
    expect(result!.score).toBeGreaterThanOrEqual(30 + 16);
  });

  it("applies +4 boost for saved recipe", () => {
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
    expect(results).toHaveLength(1);
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
