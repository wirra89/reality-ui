"use client";

// components/MealRecommendationCards.tsx
// Phase-aware meal cards. Each slot resolves in priority order:
//   1. Scored recipe from the recipe engine
//   2. Food item from the phase food pool (existing fallback)
// The Food fallback path is identical to the previous implementation.

import { useState, useEffect, useMemo } from "react";
import {
  getFoodsForPhase,
  logFood,
  logRecipe,
  type Food,
  type MealType,
  type Phase,
} from "@/lib/nutrition";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";
import {
  getRecipesForPhase,
  getSavedRecipeIds,
  getHiddenRecipeIds,
  saveRecipe,
  unsaveRecipe,
  hideRecipe,
} from "@/lib/recipeQueries";
import { recommendForSlot, buildEngineInput } from "@/lib/recipeEngine";
import type { Recipe, ScoredRecipe } from "@/types/recipe";
import type { MoodLog, Profile } from "@/lib/supabase";

// ── Recipe emoji — derived from name keywords, no DB change needed ──────────
const RECIPE_EMOJI_MAP: [RegExp, string][] = [
  [/salmon|tuna|cod|halibut|trout|sardine|anchovy|mackerel|sea bass|fish/i, "🐟"],
  [/prawn|shrimp|lobster|crab|seafood/i,                                     "🦐"],
  [/chicken|turkey|poultry/i,                                                "🍗"],
  [/beef|steak|mince|ground beef|burger|brisket|sirloin/i,                  "🥩"],
  [/pork|bacon|ham|sausage/i,                                                "🥓"],
  [/lamb|mutton/i,                                                           "🍖"],
  [/egg|omelette|frittata|scramble/i,                                        "🥚"],
  [/avocado/i,                                                               "🥑"],
  [/spinach|kale|greens|rocket|arugula|chard/i,                             "🥬"],
  [/broccoli|cauliflower|broccolini/i,                                       "🥦"],
  [/sweet potato|yam/i,                                                      "🍠"],
  [/tomato/i,                                                                "🍅"],
  [/carrot/i,                                                                "🥕"],
  [/mushroom/i,                                                              "🍄"],
  [/lemon|lime/i,                                                            "🍋"],
  [/berry|berries|blueberry|strawberry|raspberry/i,                         "🫐"],
  [/banana/i,                                                                "🍌"],
  [/apple/i,                                                                 "🍎"],
  [/mango/i,                                                                 "🥭"],
  [/oat|porridge|granola/i,                                                  "🌾"],
  [/rice|risotto|paella/i,                                                   "🍚"],
  [/pasta|spaghetti|noodle|linguine|penne/i,                                 "🍝"],
  [/bread|toast|wrap|pitta|tortilla/i,                                       "🍞"],
  [/soup|broth|stew|chowder/i,                                               "🫕"],
  [/salad/i,                                                                 "🥗"],
  [/smoothie|shake|blend/i,                                                  "🥤"],
  [/yogurt|yoghurt/i,                                                        "🫙"],
  [/cheese/i,                                                                "🧀"],
  [/tofu|tempeh|edamame/i,                                                   "🫘"],
  [/lentil|chickpea|bean|legume/i,                                           "🫘"],
  [/almond|walnut|cashew|nut|seed/i,                                        "🌰"],
  [/chocolate|cacao|cocoa/i,                                                 "🍫"],
  [/bowl/i,                                                                  "🥣"],
  [/curry|dal|dahl/i,                                                        "🍛"],
  [/stir.fry|stir fry/i,                                                     "🥘"],
  [/taco|burrito|burrito|quesadilla/i,                                       "🌮"],
  [/pizza/i,                                                                 "🍕"],
  [/pancake|waffle/i,                                                        "🥞"],
];

function getRecipeEmoji(name: string): string {
  for (const [pattern, emoji] of RECIPE_EMOJI_MAP) {
    if (pattern.test(name)) return emoji;
  }
  return "🍽️";
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  phase: Phase;
  cycleDay: number;
  moodLog: MoodLog | null;      // check-in signals: mood, energy, symptoms, cravings
  profile: Profile | null;      // goal, dietary preferences
  onLogged: () => void;
  foods?: Food[];               // pre-loaded phase food pool (fallback source)
  loggedMealTypes?: Set<MealType>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

function getDefaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}

export default function MealRecommendationCards({
  phase,
  cycleDay,
  moodLog,
  profile,
  onLogged,
  foods: foodsProp,
  loggedMealTypes,
}: Props) {
  // ── Food fallback state (unchanged from previous implementation) ──
  const [fetchedFoods, setFetchedFoods]   = useState<Food[]>([]);
  const [loadingFoods, setLoadingFoods]   = useState(!foodsProp);
  const [swapOffsets, setSwapOffsets]     = useState<SwapOffsets>({
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  });

  // ── Recipe system state ──
  const [recipes, setRecipes]               = useState<Recipe[]>([]);
  const [savedIds, setSavedIds]             = useState<Set<number>>(new Set());
  const [hiddenIds, setHiddenIds]           = useState<Set<number>>(new Set());
  const [recipeOffsets, setRecipeOffsets]   = useState<SwapOffsets>({
    breakfast: 0, lunch: 0, dinner: 0, snack: 0,
  });

  // ── Shared state ──
  const [expanded, setExpanded]         = useState<MealType | null>(getDefaultMealType);
  const [logging, setLogging]           = useState<MealType | null>(null);
  const [saving, setSaving]             = useState<number | null>(null);
  const [loggedSlots, setLoggedSlots]   = useState<Set<MealType>>(
    () => loggedMealTypes ? new Set(loggedMealTypes) : new Set(),
  );

  // Sync logged slots when parent refreshes
  useEffect(() => {
    if (!loggedMealTypes) return;
    setLoggedSlots(prev => {
      const merged = new Set(prev);
      loggedMealTypes.forEach(t => merged.add(t));
      return merged;
    });
  }, [loggedMealTypes]);

  // ── Load food pool (fallback) ──
  const foods = foodsProp && foodsProp.length > 0 ? foodsProp : fetchedFoods;

  useEffect(() => {
    if (foodsProp && foodsProp.length > 0) { setLoadingFoods(false); return; }
    setLoadingFoods(true);
    setExpanded(null);
    setSwapOffsets({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
    getFoodsForPhase(phase).then(all => {
      const meals = all.filter(f => f.category === "meal");
      setFetchedFoods(meals.length >= 4 ? meals : all);
      setLoadingFoods(false);
    });
  }, [phase, foodsProp]);

  // ── Load recipes + saved/hidden IDs ──
  useEffect(() => {
    setRecipes([]);
    setRecipeOffsets({ breakfast: 0, lunch: 0, dinner: 0, snack: 0 });
    setExpanded(null);

    Promise.all([
      getRecipesForPhase(phase),
      getSavedRecipeIds(),
      getHiddenRecipeIds(),
    ]).then(([r, saved, hidden]) => {
      setRecipes(r);
      setSavedIds(saved);
      setHiddenIds(hidden);
    });
  }, [phase]);

  // ── Build engine input (memoised) ──
  const engineInput = useMemo(() =>
    buildEngineInput({
      phase,
      cycleDay,
      goal:             profile?.goals?.[0] ?? null,
      energy:           moodLog?.energy ?? null,
      mood:             moodLog?.mood   ?? null,
      symptoms:         moodLog?.symptoms  ?? [],
      cravings:         moodLog?.cravings  ?? [],
      savedRecipeIds:   savedIds,
      hiddenRecipeIds:  hiddenIds,
    }),
    [phase, cycleDay, profile, moodLog, savedIds, hiddenIds],
  );

  // ── Recipe options per slot (memoised) ──
  const recipeOptions = useMemo((): Record<MealType, ScoredRecipe[]> => ({
    breakfast: recommendForSlot(recipes, engineInput, "breakfast", 5),
    lunch:     recommendForSlot(recipes, engineInput, "lunch",     5),
    dinner:    recommendForSlot(recipes, engineInput, "dinner",    5),
    snack:     recommendForSlot(recipes, engineInput, "snack",     5),
  }), [recipes, engineInput]);

  const color = PHASE_COLOR[phase];

  // ── Slot resolution ──
  function getRecipePick(mealType: MealType): ScoredRecipe | null {
    const options = recipeOptions[mealType];
    if (options.length === 0) return null;
    const offset = recipeOffsets[mealType] % options.length;
    return { ...options[offset], isBestForToday: offset === 0 };
  }

  function getFoodPick(slotIndex: number, slotType: MealType): Food | null {
    if (foods.length === 0) return null;
    const idx = (cycleDay + slotIndex + swapOffsets[slotType]) % foods.length;
    return foods[idx];
  }

  // ── Swap handlers ──
  function handleRecipeSwap(type: MealType) {
    setRecipeOffsets(prev => ({ ...prev, [type]: prev[type] + 1 }));
    if (expanded === type) setExpanded(null);
  }

  function handleFoodSwap(type: MealType) {
    setSwapOffsets(prev => ({ ...prev, [type]: prev[type] + 1 }));
    if (expanded === type) setExpanded(null);
  }

  // ── Log handlers ──
  async function handleLogRecipe(scored: ScoredRecipe, mealType: MealType) {
    setLogging(mealType);
    try {
      await logRecipe(
        {
          id:        scored.recipe.id,
          name:      scored.recipe.name,
          calories:  scored.recipe.calories,
          protein_g: scored.recipe.protein_g,
          carbs_g:   scored.recipe.carbs_g,
          fat_g:     scored.recipe.fat_g,
        },
        mealType,
        cycleDay,
        phase,
      );
      setLoggedSlots(prev => new Set(prev).add(mealType));
      onLogged();
    } finally {
      setLogging(null);
    }
  }

  async function handleLogFood(food: Food, mealType: MealType) {
    setLogging(mealType);
    const qty = food.servingSizeG ?? 100;
    await logFood(food.id, qty, mealType, cycleDay, phase);
    setLogging(null);
    setLoggedSlots(prev => new Set(prev).add(mealType));
    onLogged();
  }

  // ── Save/unsave handler ──
  async function handleToggleSave(recipeId: number) {
    setSaving(recipeId);
    if (savedIds.has(recipeId)) {
      await unsaveRecipe(recipeId);
      setSavedIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
    } else {
      await saveRecipe(recipeId);
      setSavedIds(prev => new Set(prev).add(recipeId));
    }
    setSaving(null);
  }

  // ── Hide handler ──
  async function handleHide(recipeId: number) {
    await hideRecipe(recipeId);
    setHiddenIds(prev => new Set(prev).add(recipeId));
  }

  // ── Food macros helper (existing logic, unchanged) ──
  function getFoodMacros(food: Food) {
    const g = food.servingSizeG ?? 100;
    const f = g / 100;
    return {
      kcal:    Math.round(food.kcalPer100g    * f),
      protein: Math.round(food.proteinPer100g * f),
      carbs:   Math.round(food.carbsPer100g   * f),
      fats:    Math.round(food.fatsPer100g    * f),
    };
  }

  if (loadingFoods && recipes.length === 0) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-semibold text-dark">Today&apos;s meal ideas</h2>
        <span className="text-xs font-body" style={{ color: `${color}bb` }}>Phase-matched</span>
      </div>

      <div className="flex flex-col gap-3">
        {MEAL_SLOTS.map(({ type, label, emoji: slotEmoji }, i) => {
          const recipePick = getRecipePick(type);
          const isRecipeMode = recipePick !== null;

          // ── RECIPE MODE ─────────────────────────────────────────────────
          if (isRecipeMode) {
            const { recipe, matchReasons, isBestForToday } = recipePick;
            const isSaved    = savedIds.has(recipe.id);
            const isSaving   = saving === recipe.id;
            const isLogging  = logging === type;
            const isLogged   = loggedSlots.has(type);
            const isOpen     = expanded === type;
            const showAccordion = recipe.has_real_instructions;

            return (
              <div
                key={type}
                className="rounded-2xl overflow-hidden transition-opacity duration-300"
                style={{
                  background: "var(--color-surface)",
                  borderTop: "3px solid var(--color-primary)",
                  opacity: isLogged ? 0.6 : 1,
                }}
              >
                {/* Slot badge + Best for today pill + Save + Swap */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                    >
                      <span>{slotEmoji}</span>
                      <span>{label}</span>
                    </div>
                    {isBestForToday && matchReasons.length > 0 && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color: `${color}dd` }}
                      >
                        {matchReasons[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Save button */}
                    <button
                      onClick={() => !isSaving && handleToggleSave(recipe.id)}
                      className="flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-95"
                      style={{
                        background: isSaved ? `${color}33` : "rgba(0,0,0,0.04)",
                        color:      isSaved ? color : "var(--color-text-dim)",
                      }}
                      aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
                    >
                      {isSaving ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="text-xs">{isSaved ? "★" : "☆"}</span>
                      )}
                    </button>

                    {/* Swap */}
                    <button
                      onClick={() => handleRecipeSwap(type)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{ background: "rgba(0,0,0,0.04)", color: "var(--color-text-dim)" }}
                    >
                      <span>↺</span>
                      <span>Swap</span>
                    </button>
                  </div>
                </div>

                {/* Recipe name + benefits */}
                <div className="px-4 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl leading-none flex-shrink-0 mt-0.5 w-11 h-11 flex items-center justify-center rounded-2xl"
                      style={{ background: `${color}18` }}>
                      {getRecipeEmoji(recipe.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-dark font-display font-semibold text-sm leading-snug">
                        {recipe.name}
                      </p>
                      {recipe.benefits && (
                        <p className="text-xs mt-1 font-body leading-snug" style={{ color: `${color}cc` }}>
                          {recipe.benefits}
                        </p>
                      )}
                      <p className="text-xs mt-1 font-body" style={{ color: "var(--color-text-dim)" }}>
                        {recipe.prep_time_min + recipe.cook_time_min} min · {recipe.difficulty}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Macro strip */}
                <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl grid grid-cols-4" style={{ background: "var(--color-ghost)" }}>
                  {[
                    { label: "kcal",    value: `${recipe.calories}` },
                    { label: "protein", value: `${recipe.protein_g}g` },
                    { label: "carbs",   value: `${recipe.carbs_g}g` },
                    { label: "fats",    value: `${recipe.fat_g}g` },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <p className="text-dark font-semibold text-sm leading-none">{m.value}</p>
                      <p className="text-[var(--color-text-dim)] text-xs leading-none mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => !isLogged && handleLogRecipe(recipePick, type)}
                    disabled={isLogging}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    style={{
                      background: isLogged
                        ? "rgba(0,0,0,0.04)"
                        : `linear-gradient(135deg, ${color}, ${color}88)`,
                      color: isLogged ? "var(--color-text-dim)" : "var(--color-surface)",
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

                  {showAccordion && (
                    <button
                      onClick={() => setExpanded(isOpen ? null : type)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: isOpen ? `${color}22` : "rgba(0,0,0,0.04)",
                        color:      isOpen ? color : "var(--color-text-mid)",
                        border:     `1px solid ${isOpen ? color + "44" : "var(--color-border)"}`,
                      }}
                    >
                      <span>{isOpen ? "▲" : "▼"}</span>
                      <span>Recipe</span>
                    </button>
                  )}

                  {/* Hide button — only shown when not logged */}
                  {!isLogged && (
                    <button
                      onClick={() => handleHide(recipe.id)}
                      className="flex items-center justify-center w-10 py-2.5 rounded-xl text-xs transition-all active:scale-95"
                      style={{ background: "rgba(0,0,0,0.04)", color: "var(--color-text-dim)" }}
                      aria-label="Hide this recipe"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Recipe accordion — only rendered when has_real_instructions */}
                {isOpen && showAccordion && (
                  <div
                    className="mx-4 mb-4 rounded-xl px-4 py-3"
                    style={{ background: "var(--color-bg)", borderTop: `2px solid ${color}33` }}
                  >
                    {/* Description */}
                    {recipe.description && (
                      <p className="text-xs font-body leading-relaxed mb-3" style={{ color: "var(--color-text-mid)" }}>
                        {recipe.description}
                      </p>
                    )}

                    {/* Ingredients */}
                    {recipe.ingredients.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                          Ingredients
                        </p>
                        <ul className="mb-4 space-y-1">
                          {recipe.ingredients.map((ing, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs font-body text-[var(--color-text-mid)]">
                              <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                              <span>{ing}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {/* Preparation steps */}
                    {recipe.instructions.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                          Preparation
                        </p>
                        <ol className="space-y-2">
                          {recipe.instructions.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-[var(--color-text-mid)]">
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
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // ── FOOD FALLBACK MODE (unchanged from previous implementation) ──
          const food = getFoodPick(i, type);
          if (!food) return null;

          const recipe     = RECIPE_DETAILS[food.externalId ?? ""];
          const macros     = getFoodMacros(food);
          const isOpen     = expanded === type;
          const isLogging  = logging === type;
          const isLogged   = loggedSlots.has(type);

          return (
            <div
              key={type}
              className="rounded-2xl overflow-hidden transition-opacity duration-300"
              style={{
                background: "var(--color-surface)",
                borderTop: "3px solid var(--color-primary)",
                opacity: isLogged ? 0.6 : 1,
              }}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
                >
                  <span>{slotEmoji}</span>
                  <span>{label}</span>
                </div>
                <button
                  onClick={() => handleFoodSwap(type)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{ background: "rgba(0,0,0,0.04)", color: "var(--color-text-dim)" }}
                >
                  <span>↺</span>
                  <span>Swap</span>
                </button>
              </div>

              <div className="px-4 pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none flex-shrink-0 mt-0.5 w-11 h-11 flex items-center justify-center rounded-2xl"
                    style={{ background: `${color}18` }}>
                    {food.emoji ?? getRecipeEmoji(food.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-dark font-display font-semibold text-sm leading-snug">{food.name}</p>
                    <p className="text-xs mt-1 font-body leading-snug" style={{ color: `${color}cc` }}>
                      {recipe?.phaseReason ?? (food.keyNutrient ? `Key nutrient: ${food.keyNutrient}` : "")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl grid grid-cols-4" style={{ background: "var(--color-ghost)" }}>
                {[
                  { label: "kcal",    value: `${macros.kcal}` },
                  { label: "protein", value: `${macros.protein}g` },
                  { label: "carbs",   value: `${macros.carbs}g` },
                  { label: "fats",    value: `${macros.fats}g` },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-dark font-semibold text-sm leading-none">{m.value}</p>
                    <p className="text-[var(--color-text-dim)] text-xs leading-none mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => !isLogged && handleLogFood(food, type)}
                  disabled={isLogging}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  style={{
                    background: isLogged
                      ? "rgba(0,0,0,0.04)"
                      : `linear-gradient(135deg, ${color}, ${color}88)`,
                    color: isLogged ? "var(--color-text-dim)" : "var(--color-surface)",
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
                      background: isOpen ? `${color}22` : "rgba(0,0,0,0.04)",
                      color:      isOpen ? color : "var(--color-text-mid)",
                      border:     `1px solid ${isOpen ? color + "44" : "var(--color-border)"}`,
                    }}
                  >
                    <span>{isOpen ? "▲" : "▼"}</span>
                    <span>Recipe</span>
                  </button>
                )}
              </div>

              {isOpen && recipe && (
                <div
                  className="mx-4 mb-4 rounded-xl px-4 py-3"
                  style={{ background: "var(--color-bg)", borderTop: `2px solid ${color}33` }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>Ingredients</p>
                  <ul className="mb-4 space-y-1">
                    {recipe.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-body text-[var(--color-text-mid)]">
                        <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>Preparation</p>
                  <ol className="space-y-2">
                    {recipe.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-body text-[var(--color-text-mid)]">
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
