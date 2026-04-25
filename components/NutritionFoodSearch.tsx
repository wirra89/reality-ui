"use client";

// components/NutritionFoodSearch.tsx

import { useState, useEffect, useRef } from "react";
import {
  searchFoods,
  getAllFoods,
  logFood,
  calculateFoodSnapshot,
  type Food,
  type MealType,
} from "@/lib/nutrition";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";
import RecipePreviewModal, { type RecipePreviewData } from "@/components/RecipePreviewModal";

// ── Meal type options ─────────────────────────────────────────────────────────

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch"     },
  { value: "dinner",    label: "Dinner"    },
  { value: "snack",     label: "Snack"     },
];

// ── Category definitions ──────────────────────────────────────────────────────

type FilterId =
  | "all"
  | "bowls"
  | "wraps"
  | "breakfast"
  | "snacks"
  | "high-protein"
  | "low-cal"
  | "comfort"
  | "quick";

const FILTER_CATEGORIES: { id: FilterId; label: string }[] = [
  { id: "all",          label: "All"          },
  { id: "bowls",        label: "Bowls"        },
  { id: "wraps",        label: "Wraps"        },
  { id: "breakfast",    label: "Breakfast"    },
  { id: "snacks",       label: "Snacks"       },
  { id: "high-protein", label: "High Protein" },
  { id: "low-cal",      label: "Low Cal"      },
  { id: "comfort",      label: "Comfort"      },
  { id: "quick",        label: "Quick"        },
];

function categoryLabel(id: FilterId) {
  return FILTER_CATEGORIES.find(f => f.id === id)?.label ?? id;
}

/**
 * Pure function — infers which filter categories a food belongs to.
 * Uses name keywords, DB category field, and macro values.
 */
function inferFoodCategories(food: Food): FilterId[] {
  const n = food.name.toLowerCase();
  const c = (food.category ?? "").toLowerCase();
  const cats: FilterId[] = [];

  if (/bowl|poke|buddha|grain bowl|rice bowl|salad bowl/.test(n))
    cats.push("bowls");

  if (/wrap|tortilla|burrito|fajita|flatbread/.test(n))
    cats.push("wraps");

  if (/egg|oat|pancake|toast|granola|porridge|cereal|waffle|muffin|french toast|bagel/.test(n) ||
      c === "breakfast")
    cats.push("breakfast");

  if (/snack|protein bar|energy bar|nuts|nut mix|dark chocolate|date|rice cake|cracker|jerky/.test(n) ||
      c === "snack")
    cats.push("snacks");

  if (food.proteinPer100g >= 20)
    cats.push("high-protein");

  const kcalPerServing = food.servingSizeG
    ? (food.kcalPer100g * food.servingSizeG) / 100
    : food.kcalPer100g;
  if (food.kcalPer100g < 150 || kcalPerServing < 300)
    cats.push("low-cal");

  if (/soup|stew|mac|pasta|curry|casserole|risotto|chili|chilli|noodle|ramen|lasagne|lasagna/.test(n))
    cats.push("comfort");

  if (/sandwich|smoothie|shake|salad|toast|quick|overnight|no.cook/.test(n))
    cats.push("quick");

  return cats;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  cycleDay: number;
  phase: string;
  onLogged: () => void;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NutritionFoodSearch({ cycleDay, phase, onLogged, onCancel }: Props) {
  const [query, setQuery]               = useState("");
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [allFoods, setAllFoods]         = useState<Food[]>([]);
  const [browsing, setBrowsing]         = useState(false); // loading allFoods
  const [searching, setSearching]       = useState(false);
  const [selected, setSelected]         = useState<Food | null>(null);
  const [grams, setGrams]               = useState("100");
  const [mealType, setMealType]         = useState<MealType>("snack");
  const [logging, setLogging]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [showModal, setShowModal]       = useState(false);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load full food pool once on mount for category browsing
  useEffect(() => {
    setBrowsing(true);
    getAllFoods().then(foods => {
      setAllFoods(foods);
      setBrowsing(false);
    });
  }, []);

  // Debounced search by name — only fires when query is non-empty
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); setSearching(false); return; }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const foods = await searchFoods(query);
      setSearchResults(foods);
      setSearching(false);
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Result pipeline ───────────────────────────────────────────────────────
  // Source: search results when query is typed, full pool when browsing
  const pool = query.trim() ? searchResults : allFoods;

  // Apply category filter
  const filteredResults = activeFilter === "all"
    ? pool
    : pool.filter(food => inferFoodCategories(food).includes(activeFilter));

  // Show the results panel when: query is typed OR a specific category is selected
  const showResults = !selected && (query.trim().length > 0 || activeFilter !== "all");

  // Loading state: searching by name, or loading browse pool for category
  const isLoading = query.trim() ? searching : (activeFilter !== "all" && browsing);

  const quantityG = Math.max(1, parseFloat(grams) || 100);
  const preview   = selected ? calculateFoodSnapshot(selected, quantityG) : null;
  const canLog    = selected !== null && quantityG > 0 && !logging;

  async function handleLog() {
    if (!selected || !canLog) return;
    setLogging(true);
    setError(null);
    const result = await logFood(selected.id, quantityG, mealType, cycleDay, phase);
    if (result.success) {
      onLogged();
    } else {
      setError(result.error ?? "Failed to log food");
      setLogging(false);
    }
  }

  function buildRecipePreview(food: Food): RecipePreviewData {
    const detail = RECIPE_DETAILS[food.externalId ?? ""];
    const g = food.servingSizeG ?? quantityG;
    return {
      id:          food.id,
      name:        food.name,
      phaseReason: detail?.phaseReason ?? food.keyNutrient ?? undefined,
      ingredients: detail?.ingredients ?? [],
      steps:       detail?.steps ?? [],
      kcal:        Math.round(food.kcalPer100g * g / 100),
      protein:     Math.round(food.proteinPer100g * g / 100),
      carbs:       Math.round(food.carbsPer100g * g / 100),
      fats:        Math.round(food.fatsPer100g * g / 100),
    };
  }

  function handleSelectFood(food: Food) {
    setSelected(food);
    setQuery(food.name);
    setSearchResults([]);
    setGrams(String(food.servingSizeG ?? 100));
    setShowModal(false);
  }

  function handleClearSelection() {
    setSelected(null);
    setQuery("");
    setSearchResults([]);
    setGrams("100");
    setError(null);
    setShowModal(false);
  }

  // Build the empty-state message based on what's active
  function emptyMessage() {
    const cat = categoryLabel(activeFilter);
    if (activeFilter !== "all" && query.trim())
      return `No ${cat.toLowerCase()} match "${query}"`;
    if (activeFilter !== "all")
      return `Nothing found in ${cat}`;
    return `No results for "${query}"`;
  }

  return (
    <>
    {selected && showModal && (
      <RecipePreviewModal
        recipe={buildRecipePreview(selected)}
        phaseColor="#C48A97"
        onClose={() => setShowModal(false)}
        onLog={async () => {
          await handleLog();
          setShowModal(false);
        }}
      />
    )}
    <div className="bg-surface rounded-2xl shadow-card p-4 mb-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-dark">Search & log food</p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(196,138,151,0.12)", color: "#C48A97" }}>
          ✦ New
        </span>
      </div>

      {/* Meal type + search + active-filter chip */}
      <div className="flex gap-2 mb-2">
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="bg-background rounded-xl px-2 py-2.5 text-xs font-semibold text-dark outline-none flex-shrink-0"
          style={{ minWidth: 90 }}>
          {MEAL_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="relative flex-1 flex items-center gap-1.5">
          {/* Active category chip — sits inside the search row */}
          {!selected && activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="flex-shrink-0 flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #C96480, #A84468)" }}
            >
              {categoryLabel(activeFilter)}
              <span className="opacity-70 text-sm leading-none ml-0.5">×</span>
            </button>
          )}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={activeFilter !== "all" ? `Filter in ${categoryLabel(activeFilter)}…` : "Search: chicken, oats, banana…"}
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (selected) setSelected(null); }}
              className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none placeholder:text-dark/30 font-body pr-8"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={handleClearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 text-lg leading-none">
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category filter pills — hidden once a food is selected */}
      {!selected && (
        <div
          className="flex gap-1.5 pb-2 mb-1"
          style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {FILTER_CATEGORIES.map(f => {
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
      )}

      {/* Results panel — visible when query typed OR category selected */}
      {showResults && (
        <div className="rounded-xl overflow-hidden border border-[var(--color-border)] mb-3 max-h-56 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-3 text-xs text-dark/30 font-body">
              {query.trim() ? "Searching…" : `Loading ${categoryLabel(activeFilter)}…`}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="px-3 py-3 text-xs text-dark/30 font-body">{emptyMessage()}</div>
          ) : (
            filteredResults.map(food => (
              <button
                key={food.id}
                onClick={() => handleSelectFood(food)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-ghost border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  {food.emoji && <span className="text-base flex-shrink-0">{food.emoji}</span>}
                  <span className="text-sm font-semibold text-dark truncate">{food.name}</span>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {food.brand && (
                    <p className="text-xs text-dark/30 font-body">{food.brand}</p>
                  )}
                  {food.category === "meal" && food.servingSizeG ? (
                    <p className="text-xs text-dark/40">
                      {Math.round(food.kcalPer100g * food.servingSizeG / 100)} kcal · {food.servingSizeG}g
                    </p>
                  ) : (
                    <p className="text-xs text-dark/40">
                      {food.kcalPer100g} kcal · {food.proteinPer100g}g P / 100g
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected food + quantity */}
      {selected && (
        <div className="rounded-xl bg-background p-3 mb-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-dark">{selected.name}</p>
              {selected.brand && (
                <p className="text-xs text-dark/40 font-body">{selected.brand}</p>
              )}
              {selected.category === "meal" && selected.servingSizeG ? (
                <p className="text-xs text-dark/40 font-body mt-0.5">
                  Serving: {selected.servingSizeG}g · {Math.round(selected.kcalPer100g * selected.servingSizeG / 100)} kcal ·{" "}
                  {Math.round(selected.proteinPer100g * selected.servingSizeG / 100 * 10) / 10}g P
                </p>
              ) : (
                <p className="text-xs text-dark/40 font-body mt-0.5">
                  Per 100g: {selected.kcalPer100g} kcal · {selected.proteinPer100g}g P ·{" "}
                  {selected.carbsPer100g}g C · {selected.fatsPer100g}g F
                </p>
              )}
            </div>
            <button
              onClick={handleClearSelection}
              className="text-dark/20 hover:text-dark/50 transition-colors text-lg leading-none flex-shrink-0 mt-0.5">
              ×
            </button>
          </div>

          {/* Quantity input */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-dark/50 flex-shrink-0 w-16">Amount</label>
            <input
              type="number"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              min="1"
              max="2000"
              step="5"
              className="flex-1 bg-surface rounded-xl px-3 py-2 text-sm text-dark outline-none font-body text-center border border-transparent focus:border-primary/30 transition-colors"
            />
            <span className="text-sm font-semibold text-dark/40 flex-shrink-0">g</span>
          </div>

          {/* Macro preview */}
          {preview && (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "kcal", value: preview.kcal,          color: "#C48A97" },
                { label: "P",    value: `${preview.protein}g`, color: "#7B6D8D" },
                { label: "C",    value: `${preview.carbs}g`,   color: "#F59E0B" },
                { label: "F",    value: `${preview.fats}g`,    color: "#34D399" },
              ].map(m => (
                <div key={m.label} className="bg-surface rounded-xl p-2 text-center">
                  <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-dark/30 font-semibold uppercase">{m.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* View recipe — shown for any meal-category food */}
          {selected.category === "meal" && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                background: "rgba(196,138,151,0.10)",
                color: "#C48A97",
                border: "1px solid rgba(196,138,151,0.22)",
              }}
            >
              <span>📖</span>
              <span>View recipe</span>
              <span style={{ opacity: 0.5 }}>→</span>
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-500 font-body mb-2 px-1">{error}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-dark/40 bg-ghost active:scale-95 transition-all">
          Cancel
        </button>
        <button
          onClick={handleLog}
          disabled={!canLog}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
          {logging ? "Logging…" : "Log food"}
        </button>
      </div>
    </div>
    </>
  );
}
