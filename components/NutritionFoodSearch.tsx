"use client";

// components/NutritionFoodSearch.tsx
// V1.1 food search + log component.
// Searches the foods DB table (global + private) and logs via meal_log_entries.
// Coexists with legacy MealLogForm during transition period.

import { useState, useEffect, useRef } from "react";
import {
  searchFoods,
  logFood,
  calculateFoodSnapshot,
  type Food,
  type MealType,
} from "@/lib/nutrition";

const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch"     },
  { value: "dinner",    label: "Dinner"    },
  { value: "snack",     label: "Snack"     },
];

interface Props {
  cycleDay: number;
  phase: string;
  onLogged: () => void;    // called after successful log so parent can refresh entries
  onCancel: () => void;
}

export default function NutritionFoodSearch({ cycleDay, phase, onLogged, onCancel }: Props) {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState<Food[]>([]);
  const [searching, setSearching]       = useState(false);
  const [selected, setSelected]         = useState<Food | null>(null);
  const [grams, setGrams]               = useState("100");
  const [mealType, setMealType]         = useState<MealType>("snack");
  const [logging, setLogging]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — 250ms after last keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearching(false); return; }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const foods = await searchFoods(query);
      setResults(foods);
      setSearching(false);
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const quantityG    = Math.max(1, parseFloat(grams) || 100);
  const preview      = selected ? calculateFoodSnapshot(selected, quantityG) : null;
  const canLog       = selected !== null && quantityG > 0 && !logging;

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

  function handleSelectFood(food: Food) {
    setSelected(food);
    setQuery(food.name);
    setResults([]);
    // Default grams to serving size if defined, else 100g
    setGrams(String(food.servingSizeG ?? 100));
  }

  function handleClearSelection() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setGrams("100");
    setError(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 mb-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-dark">Search & log food</p>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(196,138,151,0.12)", color: "#C48A97" }}>
          ✦ New
        </span>
      </div>

      {/* Meal type + search row */}
      <div className="flex gap-2 mb-3">
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="bg-background rounded-xl px-2 py-2.5 text-xs font-semibold text-dark outline-none flex-shrink-0"
          style={{ minWidth: 90 }}>
          {MEAL_TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search: chicken, oats, banana…"
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

      {/* Search results dropdown */}
      {!selected && query.trim() && (
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-3 max-h-48 overflow-y-auto">
          {searching ? (
            <div className="px-3 py-3 text-xs text-dark/30 font-body">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-dark/30 font-body">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map(food => (
              <button
                key={food.id}
                onClick={() => handleSelectFood(food)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-gray-100 border-b border-gray-50 last:border-0">
                <span className="text-sm font-semibold text-dark">{food.name}</span>
                <div className="text-right flex-shrink-0 ml-2">
                  {food.brand && (
                    <p className="text-xs text-dark/30 font-body">{food.brand}</p>
                  )}
                  <p className="text-xs text-dark/40">
                    {food.kcalPer100g} kcal · {food.proteinPer100g}g P / 100g
                  </p>
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
              <p className="text-xs text-dark/40 font-body mt-0.5">
                Per 100g: {selected.kcalPer100g} kcal · {selected.proteinPer100g}g P ·{" "}
                {selected.carbsPer100g}g C · {selected.fatsPer100g}g F
              </p>
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
              className="flex-1 bg-white rounded-xl px-3 py-2 text-sm text-dark outline-none font-body text-center border border-transparent focus:border-primary/30 transition-colors"
            />
            <span className="text-sm font-semibold text-dark/40 flex-shrink-0">g</span>
          </div>

          {/* Macro preview */}
          {preview && (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: "kcal",  value: preview.kcal,    color: "#C48A97" },
                { label: "P",     value: `${preview.protein}g`, color: "#7B6D8D" },
                { label: "C",     value: `${preview.carbs}g`,   color: "#F59E0B" },
                { label: "F",     value: `${preview.fats}g`,    color: "#34D399"  },
              ].map(m => (
                <div key={m.label} className="bg-white rounded-xl p-2 text-center">
                  <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-dark/30 font-semibold uppercase">{m.label}</p>
                </div>
              ))}
            </div>
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
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-dark/40 bg-gray-50 active:scale-95 transition-all">
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
  );
}
