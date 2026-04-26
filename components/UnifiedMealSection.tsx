"use client";

// components/UnifiedMealSection.tsx
// Single source of truth for meal recommendations on the Meals page.
// Merges static engine-scored recipes (mealEngine) with phase Food items.
// Tapping any card opens RecipePreviewModal — logging only happens from there.

import { useMemo, useState } from "react";
import { RECIPES } from "@/lib/recipes";
import { FOOD_LIBRARY } from "@/lib/foods";
import {
  recommendMeals,
  signalsFromDaily,
  type ScoredMeal,
} from "@/lib/mealEngine";
import { logStaticRecipe, logFood, type MealType, type Food } from "@/lib/nutrition";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";
import type { DailySignals } from "@/lib/sharedSignals";
import type { Phase } from "@/lib/cycle";
import RecipePreviewModal, { type RecipePreviewData } from "@/components/RecipePreviewModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type UnifiedFilter = "all" | "bowls" | "wraps" | "soups" | "breakfasts" | "snacks" | "salads" | "high_protein" | "iron_rich";

type MealItem =
  | { kind: "static"; scored: ScoredMeal }
  | { kind: "food";   food: Food };

// ── Filter config ─────────────────────────────────────────────────────────────

const FILTERS: { id: UnifiedFilter; label: string }[] = [
  { id: "all",          label: "All"          },
  { id: "bowls",        label: "Bowls"        },
  { id: "wraps",        label: "Wraps"        },
  { id: "soups",        label: "Soups"        },
  { id: "breakfasts",   label: "Breakfast"    },
  { id: "salads",       label: "Salads"       },
  { id: "snacks",       label: "Snacks"       },
  { id: "high_protein", label: "High Protein" },
  { id: "iron_rich",    label: "Iron-rich"    },
];

// ── Static food lookup (mealType + emoji by externalId) ───────────────────────

const FOOD_BY_ID = new Map(FOOD_LIBRARY.map(f => [f.id, f]));

// ── Meal type labels & emojis ─────────────────────────────────────────────────

const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch:     "Lunch",
  dinner:    "Dinner",
  snack:     "Snack",
};

const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  breakfast: "🌅",
  lunch:     "🥗",
  dinner:    "🍽️",
  snack:     "🍎",
};

function recipeEmoji(type: string): string {
  switch (type) {
    case "bowl":      return "🥣";
    case "wrap":      return "🌯";
    case "soup":      return "🍲";
    case "breakfast": return "🌅";
    case "snack":     return "🍎";
    case "salad":     return "🥗";
    default:          return "🍽️";
  }
}

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
  ironBoost?:    boolean;
  onLogged?:     () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function foodKcal(food: Food): number {
  const g = food.servingSizeG ?? 100;
  return Math.round(food.kcalPer100g * g / 100);
}
function foodProtein(food: Food): number {
  const g = food.servingSizeG ?? 100;
  return Math.round(food.proteinPer100g * g / 100);
}
function foodCarbs(food: Food): number {
  const g = food.servingSizeG ?? 100;
  return Math.round(food.carbsPer100g * g / 100);
}
function foodFats(food: Food): number {
  const g = food.servingSizeG ?? 100;
  return Math.round(food.fatsPer100g * g / 100);
}

function scoreMatchesFilter(scored: ScoredMeal, filter: UnifiedFilter): boolean {
  const { recipe } = scored;
  if (filter === "all")          return true;
  if (filter === "bowls")        return recipe.type === "bowl";
  if (filter === "wraps")        return recipe.type === "wrap";
  if (filter === "soups")        return recipe.type === "soup";
  if (filter === "breakfasts")   return recipe.type === "breakfast";
  if (filter === "salads")       return recipe.type === "salad";
  if (filter === "snacks")       return recipe.type === "snack";
  if (filter === "high_protein") return recipe.functional_tags.includes("high_protein");
  if (filter === "iron_rich")    return recipe.functional_tags.includes("iron_rich");
  return true;
}

function foodMatchesFilter(food: Food, filter: UnifiedFilter): boolean {
  if (filter === "all")          return true;
  if (filter === "bowls")        return false;
  if (filter === "wraps")        return false;
  if (filter === "soups")        return false;
  if (filter === "breakfasts")   return false;
  if (filter === "salads")       return false;
  if (filter === "snacks")       return false;
  if (filter === "high_protein") return foodProtein(food) >= 20;
  if (filter === "iron_rich")    return !!(food.keyNutrient?.toLowerCase().includes("iron"));
  return true;
}

function buildPreviewFromStatic(scored: ScoredMeal): RecipePreviewData {
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
    id:          food.id,
    name:        food.name,
    phaseReason: detail?.phaseReason,
    ingredients: detail?.ingredients ?? [],
    steps:       detail?.steps ?? [],
    kcal:        foodKcal(food),
    protein:     foodProtein(food),
    carbs:       foodCarbs(food),
    fats:        foodFats(food),
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
  const [loggingId, setLoggingId]     = useState<string | null>(null);
  const [loggedIds, setLoggedIds]     = useState<Set<string>>(new Set());

  const color = PHASE_COLOR[phase];

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

  const scoredStatic = useMemo((): ScoredMeal[] => {
    return recommendMeals(RECIPES, mealSignals, 4);
  }, [mealSignals]);

  const items = useMemo((): MealItem[] => {
    if (activeFilter === "all") {
      // Top 2 engine-scored recipes + up to 2 phase foods (one per meal type)
      const topStatic = scoredStatic.slice(0, 2).map(s => ({ kind: "static" as const, scored: s }));
      const topFoods  = MEAL_TYPE_ORDER
        .map(mt => phaseFoods.find(f => FOOD_BY_ID.get(f.externalId ?? "")?.mealType === mt))
        .filter((f): f is Food => f !== undefined)
        .slice(0, 2)
        .map(f => ({ kind: "food" as const, food: f }));
      return [...topStatic, ...topFoods].slice(0, 4);
    }

    // Filtered views: static recipes first, then foods, cap at 4
    const staticItems: MealItem[] = scoredStatic
      .filter(s => scoreMatchesFilter(s, activeFilter))
      .map(s => ({ kind: "static" as const, scored: s }));

    const foodItems: MealItem[] = phaseFoods
      .filter(f => foodMatchesFilter(f, activeFilter))
      .slice(0, 4)
      .map(f => ({ kind: "food" as const, food: f }));

    return [...staticItems, ...foodItems].slice(0, 4);
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
      "lunch" as MealType,
      cycleDay,
      phase,
    );
    onLogged?.();
  }

  async function handleLogFood(food: Food) {
    const meta = FOOD_BY_ID.get(food.externalId ?? "");
    const mealType: MealType = meta?.mealType ?? "snack";
    await logFood(food.id, food.servingSizeG ?? 100, mealType, cycleDay, phase);
    onLogged?.();
  }

  async function handleQuickLog(item: MealItem) {
    const id = item.kind === "static" ? item.scored.recipe.id : item.food.id;
    setLoggingId(id);
    try {
      if (item.kind === "static") await handleLogStatic(item.scored);
      else await handleLogFood(item.food);
      setLoggedIds(prev => new Set(prev).add(id));
    } finally {
      setLoggingId(null);
    }
  }

  return (
    <>
      {previewItem && (
        <RecipePreviewModal
          recipe={
            previewItem.kind === "static"
              ? buildPreviewFromStatic(previewItem.scored)
              : buildPreviewFromFood(previewItem.food)
          }
          phaseColor={color}
          onClose={() => setPreviewItem(null)}
          onLog={async () => {
            const id = previewItem.kind === "static" ? previewItem.scored.recipe.id : previewItem.food.id;
            if (previewItem.kind === "static") {
              await handleLogStatic(previewItem.scored);
            } else {
              await handleLogFood(previewItem.food);
            }
            setLoggedIds(prev => new Set(prev).add(id));
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
              const isTop = idx === 0 && activeFilter !== "all";
              const name    = item.kind === "static" ? item.scored.recipe.name : item.food.name;
              const kcal    = item.kind === "static" ? item.scored.recipe.macros_per_serving.calories_kcal : foodKcal(item.food);
              const protein = item.kind === "static" ? item.scored.recipe.macros_per_serving.protein_g    : foodProtein(item.food);
              const carbs   = item.kind === "static" ? item.scored.recipe.macros_per_serving.carbs_g      : foodCarbs(item.food);
              const fats    = item.kind === "static" ? item.scored.recipe.macros_per_serving.fat_g        : foodFats(item.food);
              const reason  = item.kind === "static"
                ? (item.scored.reasons[0] ?? null)
                : (RECIPE_DETAILS[item.food.externalId ?? ""]?.phaseReason?.split(".")[0] ?? item.food.keyNutrient ?? null);
              const prepMin    = item.kind === "static" ? item.scored.recipe.prep_time_min : undefined;
              const difficulty = item.kind === "static" ? item.scored.recipe.difficulty    : undefined;
              const staticFoodMeta = item.kind === "food" ? FOOD_BY_ID.get(item.food.externalId ?? "") : undefined;
              const emoji      = item.kind === "static"
                ? recipeEmoji(item.scored.recipe.type as string)
                : (item.food.emoji ?? staticFoodMeta?.emoji ?? MEAL_TYPE_EMOJI[staticFoodMeta?.mealType ?? "snack"] ?? "🍽️");
              const mealLabel  = item.kind === "food"
                ? MEAL_TYPE_LABEL[staticFoodMeta?.mealType ?? "snack"]
                : null;

              const itemId    = item.kind === "static" ? item.scored.recipe.id : item.food.id;
              const isLogging = loggingId === itemId;
              const isLogged  = loggedIds.has(itemId);

              return (
                <div
                  key={itemId}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderTop: isTop ? `3px solid ${color}` : "1px solid var(--color-border)",
                    boxShadow: isTop ? `0 4px 16px ${color}22` : "none",
                  }}
                >
                  {/* Tappable body → opens recipe modal */}
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="w-full text-left transition-colors active:bg-black/[0.02]"
                  >
                    {/* Name + reason */}
                    <div className="px-4 pt-4 pb-2 flex gap-3 items-start">
                      {/* Emoji badge */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: `${color}15` }}
                      >
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {mealLabel && (
                            <span className="text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
                              style={{ color: `${color}99` }}>
                              {mealLabel}
                            </span>
                          )}
                          {isTop && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: `${color}18`, color: `${color}cc` }}
                            >
                              Top pick
                            </span>
                          )}
                        </div>
                        <p className="font-display font-semibold text-sm text-dark leading-snug">
                          {name}
                        </p>
                        {reason && (
                          <p className="text-xs font-body mt-0.5 leading-snug" style={{ color: `${color}cc` }}>
                            {reason}
                          </p>
                        )}
                      </div>
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

                    {/* Meta */}
                    {prepMin && (
                      <div className="px-4 pb-2">
                        <span className="text-xs font-body text-dark/30">{prepMin} min · {difficulty}</span>
                      </div>
                    )}
                  </button>

                  {/* Action row */}
                  <div className="px-3 pb-3.5 flex gap-2">
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1"
                      style={{
                        background: `${color}12`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      📖 View recipe
                    </button>
                    <button
                      onClick={() => handleQuickLog(item)}
                      disabled={isLogging || isLogged}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1"
                      style={{
                        background: isLogged
                          ? "rgba(0,0,0,0.05)"
                          : `linear-gradient(135deg, ${color}, ${color}99)`,
                        color: isLogged ? "var(--color-text-dim)" : "white",
                      }}
                    >
                      {isLogging ? "…" : isLogged ? "✓ Logged" : "Log meal"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
