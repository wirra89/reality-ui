// lib/foodLogs.ts
// Supabase operations for favorites, recent foods, and custom food creation.

import { createClient } from "@supabase/supabase-js";
import { getMyFoods }   from "@/lib/nutrition";
import type { UnifiedFood } from "@/lib/foodSearch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface FavoriteFood {
  id:         string;
  foodSource: string;
  foodId:     string;
  foodData:   UnifiedFood;
  createdAt:  string;
}

export async function getFavorites(): Promise<FavoriteFood[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("favorite_foods")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id:         r.id,
    foodSource: r.food_source,
    foodId:     r.food_id,
    foodData:   r.food_data as UnifiedFood,
    createdAt:  r.created_at,
  }));
}

export async function addFavorite(food: UnifiedFood): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const colonIdx = food.uid.indexOf(":");
  const source   = food.uid.slice(0, colonIdx);
  const foodId   = food.uid.slice(colonIdx + 1);
  const { error } = await supabase.from("favorite_foods").upsert(
    { user_id: user.id, food_source: source, food_id: foodId, food_data: food },
    { onConflict: "user_id,food_source,food_id" },
  );
  return !error;
}

export async function removeFavorite(uid: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const colonIdx = uid.indexOf(":");
  const source   = uid.slice(0, colonIdx);
  const foodId   = uid.slice(colonIdx + 1);
  const { error } = await supabase.from("favorite_foods")
    .delete()
    .eq("user_id", user.id)
    .eq("food_source", source)
    .eq("food_id", foodId);
  return !error;
}

export async function getFavoriteUids(): Promise<Set<string>> {
  const favs = await getFavorites();
  return new Set(favs.map(f => `${f.foodSource}:${f.foodId}`));
}

// ── Recent foods ──────────────────────────────────────────────────────────────

export interface RecentFood {
  snapshotName: string;
  kcal:         number;
  protein:      number;
  carbs:        number;
  fats:         number;
  loggedAt:     string;
  foodId:       string | null;
}

export async function getRecentFoods(limit = 20): Promise<RecentFood[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("meal_log_entries")
    .select("snapshot_name,snapshot_kcal,snapshot_protein_g,snapshot_carbs_g,snapshot_fats_g,logged_at,food_id")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(limit * 4);
  if (!data) return [];

  const seen   = new Set<string>();
  const result: RecentFood[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of data as any[]) {
    const key = r.snapshot_name.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      snapshotName: r.snapshot_name,
      kcal:         r.snapshot_kcal,
      protein:      r.snapshot_protein_g,
      carbs:        r.snapshot_carbs_g,
      fats:         r.snapshot_fats_g,
      loggedAt:     r.logged_at,
      foodId:       r.food_id ?? null,
    });
    if (result.length >= limit) break;
  }
  return result;
}

// Convert a recent entry to a UnifiedFood for display in the detail modal.
// Snapshot values are treated as "per serving" with servingSizeG = 100 proxy.
export function recentToUnifiedFood(r: RecentFood): UnifiedFood {
  return {
    uid:               `recent:${encodeURIComponent(r.snapshotName)}`,
    source:            "recent",
    name:              r.snapshotName,
    brand:             null,
    kcalPer100g:       r.kcal,
    proteinPer100g:    r.protein,
    carbsPer100g:      r.carbs,
    fatsPer100g:       r.fats,
    fiberPer100g:      null,
    servingSizeG:      100,
    servingLabel:      "1 serving (as logged)",
    availableServings: [{ label: "1 serving (as logged)", grams: 100 }],
    confidence:        "medium",
    emoji:             null,
    barcode:           null,
    phaseHint:         null,
    dbFoodId:          r.foodId,
    recipeId:          null,
  };
}

// ── My Foods as UnifiedFood ──────────────────────────────────────────────────

export async function getMyFoodsUnified(): Promise<UnifiedFood[]> {
  const foods = await getMyFoods();
  return foods.map(food => ({
    uid:               `db:${food.id}`,
    source:            "custom" as const,
    name:              food.name,
    brand:             food.brand,
    kcalPer100g:       food.kcalPer100g,
    proteinPer100g:    food.proteinPer100g,
    carbsPer100g:      food.carbsPer100g,
    fatsPer100g:       food.fatsPer100g,
    fiberPer100g:      food.fiberPer100g,
    servingSizeG:      food.servingSizeG ?? 100,
    servingLabel:      food.servingSizeG ? `${food.servingSizeG}g` : "100g",
    availableServings: food.servingSizeG
      ? [{ label: `${food.servingSizeG}g`, grams: food.servingSizeG }, { label: "100g", grams: 100 }]
      : [{ label: "100g", grams: 100 }],
    confidence:        "high",
    emoji:             food.emoji,
    barcode:           null,
    phaseHint:         null,
    dbFoodId:          food.id,
    recipeId:          null,
  }));
}

// ── Custom food creation ──────────────────────────────────────────────────────

export interface CreateCustomFoodInput {
  name:           string;
  brand?:         string;
  kcalPer100g:    number;
  proteinPer100g: number;
  carbsPer100g:   number;
  fatsPer100g:    number;
  fiberPer100g?:  number;
  servingSizeG?:  number;
  emoji?:         string;
}

export async function createCustomFood(
  input: CreateCustomFoodInput,
): Promise<{ success: boolean; foodId?: string; error?: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("foods")
    .insert({
      created_by:       user.id,
      is_global:        false,
      is_locked:        false,
      name:             input.name.trim(),
      brand:            input.brand?.trim() ?? null,
      kcal_per_100g:    input.kcalPer100g,
      protein_per_100g: input.proteinPer100g,
      carbs_per_100g:   input.carbsPer100g,
      fats_per_100g:    input.fatsPer100g,
      fiber_per_100g:   input.fiberPer100g ?? null,
      serving_size_g:   input.servingSizeG ?? null,
      emoji:            input.emoji ?? null,
      category:         "custom",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, foodId: data?.id };
}
