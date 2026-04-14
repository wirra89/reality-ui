"use client";

// components/MealRecommendationCards.tsx
// Phase-aware meal recommendation cards with expandable recipe details.
// Each card covers one meal slot (breakfast / lunch / dinner / snack).
// Foods are picked deterministically from the composite-meal pool for the
// current phase; the user can swap to cycle through alternatives.

import { useState, useEffect } from "react";
import { getFoodsForPhase, logFood, type Food, type MealType, type Phase } from "@/lib/nutrition";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";

interface Props {
  phase: Phase;
  cycleDay: number;
  onLogged: () => void;
  foods?: Food[];              // pre-loaded pool from page; if provided, skips internal fetch
  loggedMealTypes?: Set<MealType>; // meal types already logged today — drives initial ✓ state
}

const PHASE_COLOR: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

const MEAL_SLOTS: { type: MealType; label: string; emoji: string }[] = [
  { type: "breakfast", label: "Breakfast", emoji: "🌅" },
  { type: "lunch",     label: "Lunch",     emoji: "☀️" },
  { type: "dinner",    label: "Dinner",    emoji: "🌙" },
  { type: "snack",     label: "Snack",     emoji: "🍃" },
];

type SwapOffsets = Record<MealType, number>;

export default function MealRecommendationCards({ phase, cycleDay, onLogged, foods: foodsProp, loggedMealTypes }: Props) {
  const [fetchedFoods, setFetchedFoods]   = useState<Food[]>([]);
  const [loadingFoods, setLoadingFoods]   = useState(!foodsProp);
  const [swapOffsets, setSwapOffsets]     = useState<SwapOffsets>({
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  });
  const [expanded, setExpanded] = useState<MealType | null>(null);
  const [logging, setLogging]   = useState<MealType | null>(null);
  const [loggedSlots, setLoggedSlots] = useState<Set<MealType>>(
    () => loggedMealTypes ? new Set(loggedMealTypes) : new Set()
  );

  // Sync loggedSlots when parent refreshes after a log — merge so local optimistic adds are kept.
  useEffect(() => {
    if (!loggedMealTypes) return;
    setLoggedSlots(prev => {
      const merged = new Set(prev);
      loggedMealTypes.forEach(t => merged.add(t));
      return merged;
    });
  }, [loggedMealTypes]);

  // Use pre-loaded foods if provided; otherwise fetch internally.
  const foods = foodsProp && foodsProp.length > 0 ? foodsProp : fetchedFoods;

  const color = PHASE_COLOR[phase];

  useEffect(() => {
    // Skip fetch if parent already provides the food pool.
    if (foodsProp && foodsProp.length > 0) {
      setLoadingFoods(false);
      return;
    }
    setLoadingFoods(true);
    setExpanded(null);
    setSwapOffsets({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
    getFoodsForPhase(phase).then(all => {
      const meals = all.filter(f => f.category === "meal");
      setFetchedFoods(meals.length >= 4 ? meals : all);
      setLoadingFoods(false);
    });
  }, [phase, foodsProp]);

  // Pick food for a slot: (cycleDay + slotIndex + swapOffset) % pool.length
  // — simple, no collisions between slots on the same day,
  //   each swap moves exactly one step through the pool.
  function pickFood(slotIndex: number, slotType: MealType): Food {
    const idx = (cycleDay + slotIndex + swapOffsets[slotType]) % foods.length;
    return foods[idx];
  }

  function handleSwap(type: MealType) {
    setSwapOffsets(prev => ({ ...prev, [type]: prev[type] + 1 }));
    if (expanded === type) setExpanded(null);
  }

  async function handleLog(food: Food, mealType: MealType) {
    setLogging(mealType);
    const qty = food.servingSizeG ?? 100;
    await logFood(food.id, qty, mealType, cycleDay, phase);
    setLogging(null);
    setLoggedSlots(prev => new Set(prev).add(mealType));
    onLogged();
  }

  function getMacros(food: Food) {
    const g = food.servingSizeG ?? 100;
    const f = g / 100;
    return {
      kcal:    Math.round(food.kcalPer100g    * f),
      protein: Math.round(food.proteinPer100g * f),
      carbs:   Math.round(food.carbsPer100g   * f),
      fats:    Math.round(food.fatsPer100g    * f),
    };
  }

  if (loadingFoods || foods.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-semibold text-dark">Today&apos;s meal ideas</h2>
        <span className="text-xs font-body" style={{ color: `${color}bb` }}>
          Phase-matched
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {MEAL_SLOTS.map(({ type, label, emoji: slotEmoji }, i) => {
          const food       = pickFood(i, type);
          const recipe     = RECIPE_DETAILS[food.externalId ?? ""];
          const macros     = getMacros(food);
          const isOpen     = expanded === type;
          const isLogging  = logging === type;
          const isLogged   = loggedSlots.has(type);

          return (
            <div
              key={type}
              className="rounded-2xl overflow-hidden transition-opacity duration-300"
              style={{
                background: "linear-gradient(135deg, #2A2330 0%, #3D3248 100%)",
                opacity: isLogged ? 0.6 : 1,
              }}
            >
              {/* ── Slot badge + Swap ── */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: `${color}22`,
                    color,
                    border: `1px solid ${color}44`,
                  }}
                >
                  <span>{slotEmoji}</span>
                  <span>{label}</span>
                </div>
                <button
                  onClick={() => handleSwap(type)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  <span>↺</span>
                  <span>Swap</span>
                </button>
              </div>

              {/* ── Food name + phase reason ── */}
              <div className="px-4 pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none flex-shrink-0 mt-0.5">
                    {food.emoji ?? "🍽️"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-white font-display font-semibold text-sm leading-snug">
                      {food.name}
                    </p>
                    <p
                      className="text-xs mt-1 font-body leading-snug"
                      style={{ color: `${color}cc` }}
                    >
                      {recipe?.phaseReason ?? (food.keyNutrient ? `Key nutrient: ${food.keyNutrient}` : "")}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Macro strip ── */}
              <div
                className="mx-4 mb-3 px-3 py-2.5 rounded-xl grid grid-cols-4"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {[
                  { label: "kcal",    value: `${macros.kcal}` },
                  { label: "protein", value: `${macros.protein}g` },
                  { label: "carbs",   value: `${macros.carbs}g` },
                  { label: "fats",    value: `${macros.fats}g` },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-white font-semibold text-sm leading-none">{m.value}</p>
                    <p className="text-white/40 text-xs leading-none mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* ── Action buttons ── */}
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => !isLogged && handleLog(food, type)}
                  disabled={isLogging}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  style={{
                    background: isLogged
                      ? "rgba(255,255,255,0.1)"
                      : `linear-gradient(135deg, ${color}, ${color}88)`,
                    color: isLogged ? "rgba(255,255,255,0.5)" : "var(--color-surface)",
                  }}
                >
                  {isLogging ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Logging…</span>
                    </>
                  ) : isLogged ? (
                    <span>✓ Logged</span>
                  ) : (
                    <span>Log this</span>
                  )}
                </button>

                {recipe && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : type)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: isOpen ? `${color}22` : "rgba(255,255,255,0.07)",
                      color: isOpen ? color : "rgba(255,255,255,0.6)",
                      border: `1px solid ${isOpen ? color + "44" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    <span>{isOpen ? "▲" : "▼"}</span>
                    <span>Recipe</span>
                  </button>
                )}
              </div>

              {/* ── Expandable recipe accordion ── */}
              {isOpen && recipe && (
                <div
                  className="mx-4 mb-4 rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    borderTop: `2px solid ${color}33`,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: `${color}99` }}
                  >
                    Ingredients
                  </p>
                  <ul className="mb-4 space-y-1">
                    {recipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-body text-white/70">
                        <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>

                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: `${color}99` }}
                  >
                    Preparation
                  </p>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-white/70">
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                          style={{ background: `${color}33`, color }}
                        >
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
