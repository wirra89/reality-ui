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
