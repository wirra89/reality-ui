// lib/recipeQueries.ts
// All Supabase interaction for the recipe system.
// Keep this file focused on DB queries only — no scoring logic.

import { supabase } from "@/lib/supabase";
import type { Recipe, Phase, MealType } from "@/types/recipe";

// ── DB row → Recipe ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbRowToRecipe(row: any): Recipe {
  return {
    id:                    row.id as number,
    slug:                  row.slug as string,
    name:                  row.name as string,
    phases:                (row.phases as Phase[])     ?? [],
    meal_types:            (row.meal_types as MealType[]) ?? [],
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
