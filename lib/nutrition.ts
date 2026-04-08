// lib/nutrition.ts
// V1.1 nutrition system — foods, recipes, meal log entries.
// Coexists with legacy lib/supabase.ts meal_logs JSONB system during transition.
// DO NOT import from this file in files that still use the legacy saveMealLog/getTodayMealLog.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — exported (UI-facing)
// ─────────────────────────────────────────────────────────────────────────────

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Phase    = "menstrual" | "follicular" | "ovulation" | "luteal";
export type EntrySource = "food" | "recipe" | "legacy_snapshot";

/** A food ingredient from the foods table. */
export interface Food {
  id: string;
  externalId: string | null;     // human-readable slug (e.g. "apple") — null for user-created foods
  createdBy: string | null;      // null for global system foods
  isGlobal: boolean;
  isLocked: boolean;
  name: string;
  brand: string | null;
  servingSizeG: number | null;   // optional natural portion (e.g. 1 egg = 60g)
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  emoji: string | null;
  category: string | null;
  fiberPer100g: number | null;
  phases: Phase[] | null;
  keyNutrient: string | null;
  createdAt: string;
}

/** Nutrition values calculated at the moment of logging. Immutable after creation. */
export interface NutritionSnapshot {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}

/** Aggregated nutrition for a day or a set of entries. */
export interface NutritionSummary {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  entryCount: number;
}

/** UI-facing meal log entry — no DB snake_case or snapshot_ prefixes. */
export interface MealLogEntry {
  id: number;
  mealLogId: number;
  entrySource: EntrySource;
  mealType: MealType;
  name: string;       // snapshot_name
  kcal: number;       // snapshot_kcal
  protein: number;    // snapshot_protein_g
  carbs: number;      // snapshot_carbs_g
  fats: number;       // snapshot_fats_g
  quantityG: number | null;
  servingsConsumed: number | null;
  foodId: string | null;
  recipeId: string | null;
  loggedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — internal (DB shape, not exported)
// ─────────────────────────────────────────────────────────────────────────────

/** Direct mapping of meal_log_entries DB columns. Not exported — use MealLogEntry. */
interface MealLogEntryRow {
  id: number;
  meal_log_id: number;
  user_id: string;
  entry_source: EntrySource;
  food_id: string | null;
  recipe_id: string | null;
  quantity_g: number | null;
  servings_consumed: number | null;
  meal_type: MealType;
  snapshot_name: string;
  snapshot_kcal: number;
  snapshot_protein_g: number;
  snapshot_carbs_g: number;
  snapshot_fats_g: number;
  logged_at: string;
}

/** Direct mapping of foods DB columns. Not exported — use Food. */
interface FoodRow {
  id: string;
  external_id: string | null;
  created_by: string | null;
  is_global: boolean;
  is_locked: boolean;
  name: string;
  brand: string | null;
  serving_size_g: number | null;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  emoji: string | null;
  category: string | null;
  fiber_per_100g: number | null;
  phases: Phase[] | null;
  key_nutrient: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS — no Supabase, deterministic, testable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a FoodRow (DB shape) to a Food (UI shape).
 * Internal — not exported. All food queries pass through this.
 */
function mapRowToFood(row: FoodRow): Food {
  return {
    id:             row.id,
    externalId:     row.external_id,
    createdBy:      row.created_by,
    isGlobal:       row.is_global,
    isLocked:       row.is_locked,
    name:           row.name,
    brand:          row.brand,
    servingSizeG:   row.serving_size_g,
    kcalPer100g:    row.kcal_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g:   row.carbs_per_100g,
    fatsPer100g:    row.fats_per_100g,
    emoji:          row.emoji,
    category:       row.category,
    fiberPer100g:   row.fiber_per_100g,
    phases:         row.phases,
    keyNutrient:    row.key_nutrient,
    createdAt:      row.created_at,
  };
}

/**
 * Converts a MealLogEntryRow (DB shape) to a MealLogEntry (UI shape).
 * Internal — not exported. All entry queries pass through this.
 */
function mapRowToEntry(row: MealLogEntryRow): MealLogEntry {
  return {
    id:              row.id,
    mealLogId:       row.meal_log_id,
    entrySource:     row.entry_source,
    mealType:        row.meal_type,
    name:            row.snapshot_name,
    kcal:            row.snapshot_kcal,
    protein:         row.snapshot_protein_g,
    carbs:           row.snapshot_carbs_g,
    fats:            row.snapshot_fats_g,
    quantityG:       row.quantity_g,
    servingsConsumed: row.servings_consumed,
    foodId:          row.food_id,
    recipeId:        row.recipe_id,
    loggedAt:        row.logged_at,
  };
}

/**
 * Calculates the nutrition snapshot for a food + quantity.
 * Pure function — call before INSERT to populate snapshot fields.
 * All values rounded to 1 decimal for display consistency.
 */
export function calculateFoodSnapshot(food: Food, quantityG: number): NutritionSnapshot {
  const factor = quantityG / 100;
  return {
    name:    food.name,
    kcal:    Math.round(food.kcalPer100g    * factor * 10) / 10,
    protein: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbs:   Math.round(food.carbsPer100g   * factor * 10) / 10,
    fats:    Math.round(food.fatsPer100g    * factor * 10) / 10,
  };
}

/**
 * Calculates the nutrition snapshot for a recipe + servings consumed.
 * recipe.totalKcal etc. represent the full recipe (all servings).
 * We scale by (servingsConsumed / recipe.servings).
 */
export function calculateRecipeSnapshot(
  recipe: { name: string; servings: number; totalKcal: number; totalProteinG: number; totalCarbsG: number; totalFatsG: number },
  servingsConsumed: number,
): NutritionSnapshot {
  // Guard: servings must be > 0 (DB constraint enforces this, but be safe in pure code)
  const ratio = recipe.servings > 0 ? servingsConsumed / recipe.servings : 0;
  return {
    name:    recipe.name,
    kcal:    Math.round(recipe.totalKcal    * ratio * 10) / 10,
    protein: Math.round(recipe.totalProteinG * ratio * 10) / 10,
    carbs:   Math.round(recipe.totalCarbsG  * ratio * 10) / 10,
    fats:    Math.round(recipe.totalFatsG   * ratio * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH HELPER — internal
// ─────────────────────────────────────────────────────────────────────────────

async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrCreateTodayMealLog — INTERNAL, not exported
// ─────────────────────────────────────────────────────────────────────────────
//
// Returns the meal_log_id for today's meal_logs row, creating it if needed.
//
// Implementation: single UPSERT with onConflict (user_id, date).
// This is safe for concurrent/rapid calls — the DB unique constraint + upsert
// semantics guarantee exactly one row per user per date regardless of
// how many calls arrive simultaneously. No SELECT + INSERT pattern.
//
// The returned id is used as the FK in meal_log_entries.
//
async function getOrCreateTodayMealLog(cycleDay: number, phase: string): Promise<number> {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");

  const today = new Date().toISOString().split("T")[0];

  // Single upsert — atomically inserts or returns existing row.
  // onConflict targets the UNIQUE INDEX meal_logs_user_date_unique (user_id, date).
  // ignoreDuplicates: false → on conflict, UPDATE updated fields so we always
  // get the row back via .select().
  // We update cycle_day/phase on conflict so stale values from midnight rollover
  // are corrected if the user's cycle advances mid-day.
  const { data, error } = await supabase
    .from("meal_logs")
    .upsert(
      {
        user_id:   user.id,
        date:      today,
        cycle_day: cycleDay,
        phase:     phase,
        // meals JSONB is not touched — legacy column, managed by old saveMealLog only
      },
      {
        onConflict:      "user_id,date",
        ignoreDuplicates: false,  // DO UPDATE so we get data back
      },
    )
    .select("id")
    .single();

  if (error) throw new Error(`getOrCreateTodayMealLog failed: ${error.message}`);
  if (!data) throw new Error("getOrCreateTodayMealLog: no data returned from upsert");

  return data.id as number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD HELPERS — exported
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches a single food by ID.
 * Returns null if not found or not accessible (RLS filters out inaccessible foods).
 */
export async function getFoodById(id: string): Promise<Food | null> {
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getFoodById error:", error.message);
    return null;
  }

  return data ? mapRowToFood(data as FoodRow) : null;
}

/**
 * Searches foods by name (case-insensitive, partial match).
 * Returns global foods + user's own private foods — RLS handles filtering.
 * No phase filtering — relevance is a UI/business layer concern.
 * Limit 20 to keep results focused for mobile list display.
 */
export async function searchFoods(query: string): Promise<Food[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .ilike("name", `%${query.trim()}%`)
    .order("is_global", { ascending: false }) // global foods first
    .order("name",      { ascending: true  })
    .limit(20);

  if (error) {
    console.error("searchFoods error:", error.message);
    return [];
  }

  return (data as FoodRow[]).map(mapRowToFood);
}

/**
 * Returns the user's own private foods, ordered by most recently created.
 * Used for "My foods" tab in future UI slices.
 */
export async function getMyFoods(): Promise<Food[]> {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("created_by", user.id)
    .eq("is_global", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getMyFoods error:", error.message);
    return [];
  }

  return (data as FoodRow[]).map(mapRowToFood);
}

/**
 * Deletes a single meal log entry.
 * RLS ensures users can only delete their own entries.
 */
export async function deleteMealEntry(entryId: number): Promise<{ success: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("meal_log_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id); // belt-and-suspenders: RLS also enforces this

  if (error) {
    console.error("deleteMealEntry error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEAL LOG ENTRY READ HELPERS — internal + exported
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all meal_log_entries for a given date string (YYYY-MM-DD).
 * Internal — used by getTodayMealEntries and getMealEntriesForDate.
 *
 * Date filtering: uses .gte/.lt on the timestamptz logged_at column.
 * All timestamps are stored in UTC. The date string is treated as UTC midnight.
 * This is consistent with how all other date-keyed tables work in this app.
 *
 * No joins — all required data is in meal_log_entries snapshot columns.
 * RLS enforces user_id at DB level; explicit filter helps the query planner
 * use idx_meal_log_entries_logged_at (user_id, logged_at DESC).
 */
async function getMealEntriesByDate(date: string): Promise<MealLogEntry[]> {
  const user = await getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("meal_log_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", `${date}T00:00:00.000Z`)
    .lt("logged_at",  `${date}T23:59:59.999Z`)
    .order("logged_at", { ascending: true });

  if (error) {
    console.error("getMealEntriesByDate error:", error.message);
    return [];
  }

  return (data as MealLogEntryRow[]).map(mapRowToEntry);
}

/**
 * Returns all meal log entries for today.
 * Thin wrapper over getMealEntriesByDate — today is always UTC date string.
 */
export async function getTodayMealEntries(): Promise<MealLogEntry[]> {
  const today = new Date().toISOString().split("T")[0];
  return getMealEntriesByDate(today);
}

/**
 * Returns all meal log entries for a specific date.
 * Public API for History page (V1.2+) and any date-based views.
 * date format: YYYY-MM-DD (UTC)
 */
export async function getMealEntriesForDate(date: string): Promise<MealLogEntry[]> {
  return getMealEntriesByDate(date);
}

/**
 * Returns aggregated nutrition totals for today as a single DB round trip.
 *
 * Uses a Supabase RPC (get_nutrition_summary_for_date) which runs a SQL SUM
 * aggregate server-side — not a JS reduce over fetched rows.
 *
 * Returns zeroed NutritionSummary if no entries exist today (safe default
 * for Dashboard calorie card on days with no logged meals).
 */
export async function getTodayNutritionSummary(): Promise<NutritionSummary> {
  const user = await getUser();
  if (!user) return { kcal: 0, protein: 0, carbs: 0, fats: 0, entryCount: 0 };

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase.rpc("get_nutrition_summary_for_date", {
    p_user_id: user.id,
    p_date:    today,
  });

  if (error) {
    console.error("getTodayNutritionSummary error:", error.message);
    return { kcal: 0, protein: 0, carbs: 0, fats: 0, entryCount: 0 };
  }

  // RPC returns a single-row array — data[0] is always present (COALESCE in SQL)
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { kcal: 0, protein: 0, carbs: 0, fats: 0, entryCount: 0 };

  return {
    kcal:       Number(row.total_kcal    ?? 0),
    protein:    Number(row.total_protein ?? 0),
    carbs:      Number(row.total_carbs   ?? 0),
    fats:       Number(row.total_fats    ?? 0),
    entryCount: Number(row.entry_count   ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEAL LOG ENTRY HELPERS — exported
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs a food item as a meal entry for today.
 *
 * Flow:
 *   1. Fetch food (validates access + gets macro data)
 *   2. Calculate immutable nutrition snapshot
 *   3. getOrCreateTodayMealLog (single upsert — race-condition safe)
 *   4. INSERT into meal_log_entries
 *
 * No SELECT + INSERT race condition risk:
 *   - Step 3 is a single atomic upsert
 *   - Step 4 is a plain INSERT with no uniqueness dependency
 */
export async function logFood(
  foodId: string,
  quantityG: number,
  mealType: MealType,
  cycleDay: number,
  phase: string,
): Promise<{ success: boolean; error?: string; entryId?: number }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Step 1: Fetch food — validates RLS access and retrieves macro data
  const food = await getFoodById(foodId);
  if (!food) return { success: false, error: "Food not found or not accessible" };

  // Step 2: Calculate snapshot — pure, no async
  const snapshot = calculateFoodSnapshot(food, quantityG);

  // Step 3: Get or create today's meal_logs row — single atomic upsert
  let mealLogId: number;
  try {
    mealLogId = await getOrCreateTodayMealLog(cycleDay, phase);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Could not create meal log: ${msg}` };
  }

  // Step 4: Insert the entry — snapshot values are now fixed and immutable
  const { data, error } = await supabase
    .from("meal_log_entries")
    .insert({
      meal_log_id:       mealLogId,
      user_id:           user.id,       // denormalized for RLS performance
      entry_source:      "food" as EntrySource,
      food_id:           foodId,
      recipe_id:         null,
      quantity_g:        quantityG,
      servings_consumed: null,
      meal_type:         mealType,
      snapshot_name:     snapshot.name,
      snapshot_kcal:     snapshot.kcal,
      snapshot_protein_g: snapshot.protein,
      snapshot_carbs_g:  snapshot.carbs,
      snapshot_fats_g:   snapshot.fats,
      // logged_at defaults to now() in DB
    })
    .select("id")
    .single();

  if (error) {
    console.error("logFood insert error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, entryId: data?.id as number };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEAL RECOMMENDATIONS — exported
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all global foods tagged for a given phase.
 * Used to build the daily meal recommendation cards.
 */
export async function getFoodsForPhase(phase: Phase): Promise<Food[]> {
  const { data, error } = await supabase
    .from("foods")
    .select("*")
    .eq("is_global", true)
    .contains("phases", [phase]);

  if (error) {
    console.error("getFoodsForPhase error:", error.message);
    return [];
  }

  return (data as FoodRow[]).map(mapRowToFood);
}

/** Category buckets that map meal slots to appropriate food categories. */
const MEAL_CATEGORIES: Record<MealType, string[]> = {
  breakfast: ["grain", "dairy", "fruit"],
  lunch:     ["protein", "vegetable"],
  dinner:    ["protein", "vegetable", "grain"],
  snack:     ["fruit", "fat", "dairy", "other"],
};

/**
 * Deterministically picks one food per meal slot from a pool of phase-filtered foods.
 * Pure function — no async, fully testable.
 *
 * Selection is stable within a cycle day but varies across slots (each slot uses
 * a different prime multiplier so breakfast ≠ lunch ≠ dinner ≠ snack).
 * Falls back to the full pool if no foods match the preferred categories for a slot.
 */
export function pickMealRecommendations(
  foods: Food[],
  cycleDay: number,
): Record<MealType, Food | null> {
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const result = {} as Record<MealType, Food | null>;

  for (let i = 0; i < mealTypes.length; i++) {
    const mealType = mealTypes[i];
    const preferred = foods.filter(f => MEAL_CATEGORIES[mealType].includes(f.category ?? ""));
    const pool = preferred.length > 0 ? preferred : foods;
    if (pool.length === 0) { result[mealType] = null; continue; }
    // Different prime per slot so each card shows a different food on the same cycleDay
    const primes = [7, 31, 13, 19];
    const idx = (cycleDay * primes[i]) % pool.length;
    result[mealType] = pool[idx];
  }

  return result;
}
