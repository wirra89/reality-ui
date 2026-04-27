// lib/foodSearch.ts
// Unified food search aggregator across Open Food Facts, USDA, HerPhase recipes,
// and Supabase (custom + favorites). Returns a single UnifiedFood[] regardless of source.

import { searchOFF, lookupBarcode, type OFFFood } from "@/lib/openFoodFacts";
import { searchUSDA, type USDAFood }               from "@/lib/usdaFoodData";
import { RECIPES, type MealRecipe }                from "@/lib/recipes";
import { searchFoods, getMyFoods, type Food }      from "@/lib/nutrition";
import type { Phase }                              from "@/lib/cycle";

// ── Unified types ─────────────────────────────────────────────────────────────

export type FoodSource   = "branded" | "generic" | "recipe" | "custom" | "recent";
export type SearchFilter = "all" | "branded" | "generic" | "recipes" | "my_foods" | "recent";

export interface ServingOption {
  label: string;
  grams: number;
}

export interface UnifiedFood {
  uid:               string;         // "off:barcode" | "usda:fdcId" | "hph:recipeId" | "db:uuid"
  source:            FoodSource;
  name:              string;
  brand:             string | null;
  kcalPer100g:       number;
  proteinPer100g:    number;
  carbsPer100g:      number;
  fatsPer100g:       number;
  fiberPer100g:      number | null;
  servingSizeG:      number;         // default portion in grams
  servingLabel:      string;         // human label for that serving
  availableServings: ServingOption[];
  confidence:        "high" | "medium" | "low";
  emoji:             string | null;
  barcode:           string | null;
  phaseHint:         string | null;
  dbFoodId:          string | null;  // foods.id if this came from Supabase
  recipeId:          string | null;  // recipe.id if this is a HerPhase recipe
}

// ── Phase hint logic ──────────────────────────────────────────────────────────

const PHASE_TAGS: Record<Phase, string[]> = {
  menstrual:  ["iron_rich", "omega3", "magnesium", "anti_inflammatory", "anti-inflammatory"],
  follicular: ["high_protein", "hormone_balance", "complex_carbs", "probiotic"],
  ovulation:  ["high_protein", "zinc", "antioxidant", "omega3"],
  luteal:     ["magnesium", "complex_carbs", "serotonin_support", "omega3", "calming"],
};

const PHASE_LABEL: Record<Phase, string> = {
  menstrual:  "menstrual",
  follicular: "follicular",
  ovulation:  "ovulation",
  luteal:     "luteal",
};

function recipePhaseHint(recipe: MealRecipe, phase: Phase): string | null {
  if (!recipe.phase_support.includes(phase)) return null;
  const tags = PHASE_TAGS[phase];
  const hit  = recipe.functional_tags.find(t => tags.includes(t));
  if (!hit) return `✦ Recommended for ${PHASE_LABEL[phase]} phase`;
  return `✦ ${hit.replace(/_/g, " ")} — good for ${PHASE_LABEL[phase]}`;
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function fromOFF(f: OFFFood): UnifiedFood {
  const servings: ServingOption[] = [{ label: "100g", grams: 100 }];
  if (f.servingSizeG && f.servingSizeLabel) {
    servings.unshift({ label: f.servingSizeLabel, grams: f.servingSizeG });
  }
  const defaultG = f.servingSizeG ?? 100;
  return {
    uid:               `off:${f.barcode}`,
    source:            "branded",
    name:              f.name,
    brand:             f.brand,
    kcalPer100g:       f.kcalPer100g,
    proteinPer100g:    f.proteinPer100g,
    carbsPer100g:      f.carbsPer100g,
    fatsPer100g:       f.fatsPer100g,
    fiberPer100g:      f.fiberPer100g,
    servingSizeG:      defaultG,
    servingLabel:      f.servingSizeLabel ?? "100g",
    availableServings: servings,
    confidence:        f.confidence,
    emoji:             null,
    barcode:           f.barcode,
    phaseHint:         null,
    dbFoodId:          null,
    recipeId:          null,
  };
}

function fromUSDA(f: USDAFood): UnifiedFood {
  const servings: ServingOption[] = [{ label: "100g", grams: 100 }];
  if (f.servingSizeG) {
    servings.unshift({ label: `1 serving (${f.servingSizeG}g)`, grams: f.servingSizeG });
  }
  return {
    uid:               `usda:${f.fdcId}`,
    source:            "generic",
    name:              f.name,
    brand:             f.brand,
    kcalPer100g:       f.kcalPer100g,
    proteinPer100g:    f.proteinPer100g,
    carbsPer100g:      f.carbsPer100g,
    fatsPer100g:       f.fatsPer100g,
    fiberPer100g:      f.fiberPer100g,
    servingSizeG:      f.servingSizeG ?? 100,
    servingLabel:      f.servingSizeG ? `${f.servingSizeG}g` : "100g",
    availableServings: servings,
    confidence:        f.confidence,
    emoji:             null,
    barcode:           null,
    phaseHint:         null,
    dbFoodId:          null,
    recipeId:          null,
  };
}

const RECIPE_PROXY_GRAMS = 300; // recipes don't specify weight — use 300g proxy

function fromRecipe(recipe: MealRecipe, phase: Phase | null): UnifiedFood {
  const m = recipe.macros_per_serving;
  return {
    uid:               `hph:${recipe.id}`,
    source:            "recipe",
    name:              recipe.name,
    brand:             "HerPhase Recipe",
    kcalPer100g:       Math.round((m.calories_kcal / RECIPE_PROXY_GRAMS) * 100),
    proteinPer100g:    Math.round((m.protein_g     / RECIPE_PROXY_GRAMS) * 100 * 10) / 10,
    carbsPer100g:      Math.round((m.carbs_g       / RECIPE_PROXY_GRAMS) * 100 * 10) / 10,
    fatsPer100g:       Math.round((m.fat_g         / RECIPE_PROXY_GRAMS) * 100 * 10) / 10,
    fiberPer100g:      null,
    servingSizeG:      RECIPE_PROXY_GRAMS,
    servingLabel:      "1 serving",
    availableServings: [
      { label: "1 serving",    grams: RECIPE_PROXY_GRAMS       },
      { label: "½ serving",    grams: RECIPE_PROXY_GRAMS / 2   },
      { label: "1½ servings",  grams: RECIPE_PROXY_GRAMS * 1.5 },
    ],
    confidence:        "high",
    emoji:             null,
    barcode:           null,
    phaseHint:         phase ? recipePhaseHint(recipe, phase) : null,
    dbFoodId:          null,
    recipeId:          recipe.id,
  };
}

function fromSupabaseFood(food: Food): UnifiedFood {
  const servings: ServingOption[] = [{ label: "100g", grams: 100 }];
  if (food.servingSizeG) {
    servings.unshift({ label: `${food.servingSizeG}g`, grams: food.servingSizeG });
  }
  return {
    uid:               `db:${food.id}`,
    source:            "custom",
    name:              food.name,
    brand:             food.brand,
    kcalPer100g:       food.kcalPer100g,
    proteinPer100g:    food.proteinPer100g,
    carbsPer100g:      food.carbsPer100g,
    fatsPer100g:       food.fatsPer100g,
    fiberPer100g:      food.fiberPer100g,
    servingSizeG:      food.servingSizeG ?? 100,
    servingLabel:      food.servingSizeG ? `${food.servingSizeG}g` : "100g",
    availableServings: servings,
    confidence:        "high",
    emoji:             food.emoji,
    barcode:           null,
    phaseHint:         null,
    dbFoodId:          food.id,
    recipeId:          null,
  };
}

// ── Recipe search ─────────────────────────────────────────────────────────────

function searchRecipes(query: string, phase: Phase | null, limit: number): UnifiedFood[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? RECIPES.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.protein_source.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      )
    : RECIPES;
  return pool
    .slice(0, limit)
    .map(r => fromRecipe(r, phase));
}

// ── De-duplicate ──────────────────────────────────────────────────────────────

function dedupe(foods: UnifiedFood[]): UnifiedFood[] {
  const seen = new Set<string>();
  return foods.filter(f => {
    // Use uid as primary key; also de-dup near-identical names from same source
    const key = f.uid.startsWith("off:") || f.uid.startsWith("usda:")
      ? `${f.source}:${f.name.toLowerCase().replace(/\s+/g, " ").slice(0, 30)}`
      : f.uid;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CONF_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ── Main API ──────────────────────────────────────────────────────────────────

export interface SearchOptions {
  query:  string;
  filter: SearchFilter;
  phase:  Phase | null;
  limit?: number;
}

export async function searchFoodsUnified(opts: SearchOptions): Promise<UnifiedFood[]> {
  const { query, filter, phase, limit = 30 } = opts;
  const q = query.trim();

  // ── Recipes filter — local only, instant ─────────────────────────────────
  if (filter === "recipes") return searchRecipes(q, phase, limit);

  // ── My Foods — Supabase user foods ──────────────────────────────────────
  if (filter === "my_foods") {
    if (!q) {
      const foods = await getMyFoods();
      return foods.map(fromSupabaseFood);
    }
    const [supaResults] = await Promise.allSettled([searchFoods(q)]);
    const supaFoods = supaResults.status === "fulfilled" ? supaResults.value : [];
    return supaFoods.map(fromSupabaseFood);
  }

  // ── All / Branded / Generic — external APIs ──────────────────────────────
  const tasks: Promise<UnifiedFood[]>[] = [];

  if (filter === "all" || filter === "branded") {
    if (q) tasks.push(searchOFF(q, limit).then(r => r.map(fromOFF)));
  }
  if (filter === "all" || filter === "generic") {
    if (q) tasks.push(searchUSDA(q, limit).then(r => r.map(fromUSDA)));
  }
  if ((filter === "all") && q) {
    tasks.push(Promise.resolve(searchRecipes(q, phase, 5)));
  }
  // Also fold in user's Supabase foods for "all" filter
  if (filter === "all" && q) {
    tasks.push(searchFoods(q).then(r => r.map(fromSupabaseFood)));
  }

  if (tasks.length === 0) return [];

  const settled = await Promise.allSettled(tasks);
  const merged: UnifiedFood[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") merged.push(...r.value);
  }

  return dedupe(merged)
    .sort((a, b) => CONF_ORDER[a.confidence] - CONF_ORDER[b.confidence])
    .slice(0, limit);
}

export async function lookupBarcodeUnified(barcode: string): Promise<UnifiedFood | null> {
  const food = await lookupBarcode(barcode);
  if (!food) return null;
  return fromOFF(food);
}

// ── Macro calc helper ─────────────────────────────────────────────────────────

export function calcMacros(food: UnifiedFood, grams: number) {
  const f = grams / 100;
  return {
    kcal:    Math.round(food.kcalPer100g    * f),
    protein: Math.round(food.proteinPer100g * f * 10) / 10,
    carbs:   Math.round(food.carbsPer100g   * f * 10) / 10,
    fats:    Math.round(food.fatsPer100g    * f * 10) / 10,
  };
}
