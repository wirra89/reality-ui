"use client";

// components/FoodDetailModal.tsx
// Full-screen modal for adjusting serving size and logging a UnifiedFood entry.

import { useState, useEffect } from "react";
import type { UnifiedFood }    from "@/lib/foodSearch";
import { calcMacros }          from "@/lib/foodSearch";
import {
  logFood,
  logStaticRecipe,
  type MealType,
} from "@/lib/nutrition";
import type { Phase } from "@/lib/cycle";

// ── Source colours ────────────────────────────────────────────────────────────

const SOURCE_COLOR: Record<string, string> = {
  branded: "#3B82F6",
  generic: "#10B981",
  recipe:  "#C96480",
  custom:  "#9333EA",
  recent:  "#D97706",
};

const SOURCE_LABEL: Record<string, string> = {
  branded: "Open Food Facts",
  generic: "USDA FoodData",
  recipe:  "HerPhase Recipe",
  custom:  "My Food",
  recent:  "Recently logged",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  food:      UnifiedFood;
  phase:     Phase;
  cycleDay:  number;
  onClose:   () => void;
  onLogged:  () => void;
}

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅" },
  { value: "lunch",     label: "Lunch",     emoji: "☀️" },
  { value: "dinner",    label: "Dinner",    emoji: "🌙" },
  { value: "snack",     label: "Snack",     emoji: "🍎" },
];

const PHASE_COLOR: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function FoodDetailModal({ food, phase, cycleDay, onClose, onLogged }: Props) {
  const phaseColor  = PHASE_COLOR[phase];
  const srcColor    = SOURCE_COLOR[food.source] ?? "#C96480";
  const srcLabel    = SOURCE_LABEL[food.source] ?? food.source;

  // Serving selection
  const [servingIdx, setServingIdx] = useState(0);
  const [customGrams, setCustomGrams] = useState<string>("");
  const [useCustom, setUseCustom]   = useState(false);
  const [mealType, setMealType]     = useState<MealType>("lunch");
  const [logging, setLogging]       = useState(false);
  const [logged, setLogged]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const servings = food.availableServings;
  const selectedG = useCustom
    ? Math.max(1, parseFloat(customGrams) || 100)
    : servings[servingIdx]?.grams ?? 100;

  const macros = calcMacros(food, selectedG);

  // Sync custom grams field when switching to custom
  useEffect(() => {
    if (useCustom) setCustomGrams(String(Math.round(selectedG)));
  }, [useCustom]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLog() {
    if (logging || logged) return;
    setLogging(true);
    setError(null);
    try {
      if (food.dbFoodId) {
        // Supabase food — use proper logFood flow
        const res = await logFood(food.dbFoodId, selectedG, mealType, cycleDay, phase);
        if (!res.success) { setError(res.error ?? "Failed to log"); setLogging(false); return; }
      } else {
        // External food (OFF / USDA / recipe snapshot) — store as snapshot
        await logStaticRecipe(
          {
            name:      food.name,
            calories:  macros.kcal,
            protein_g: macros.protein,
            carbs_g:   macros.carbs,
            fat_g:     macros.fats,
          },
          mealType,
          cycleDay,
          phase,
        );
      }
      setLogged(true);
      setTimeout(() => { onLogged(); onClose(); }, 700);
    } catch {
      setError("Logging failed — please try again.");
      setLogging(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-[var(--color-border)]"
        style={{ flexShrink: 0 }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-dark/40 active:scale-90 transition-all"
          style={{ background: "var(--color-ghost)" }}
        >
          ←
        </button>
        <p className="text-sm font-semibold text-dark">Food details</p>
        <div className="w-9" />
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">

        {/* Food name + source */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${srcColor}15`, color: srcColor }}
            >
              {srcLabel}
            </span>
            {food.confidence !== "high" && (
              <span className="text-[10px] text-dark/30 font-body">· estimated values</span>
            )}
          </div>
          <h2 className="font-display text-xl font-semibold text-dark leading-snug">{food.name}</h2>
          {food.brand && food.brand !== "HerPhase Recipe" && (
            <p className="text-sm text-dark/40 font-body mt-0.5">{food.brand}</p>
          )}
          {food.phaseHint && (
            <p className="text-xs font-semibold mt-2 px-3 py-1.5 rounded-xl inline-block"
              style={{ background: `${phaseColor}12`, color: phaseColor }}>
              {food.phaseHint}
            </p>
          )}
        </div>

        {/* Macro summary card */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark/30 mb-3">
            Nutrition · {useCustom ? `${Math.round(parseFloat(customGrams) || 100)}g` : servings[servingIdx]?.label ?? "100g"}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Calories", value: macros.kcal,    unit: "kcal", color: phaseColor },
              { label: "Protein",  value: macros.protein, unit: "g",    color: "#7C3AED" },
              { label: "Carbs",    value: macros.carbs,   unit: "g",    color: "#F59E0B" },
              { label: "Fat",      value: macros.fats,    unit: "g",    color: "#10B981" },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="font-bold text-base leading-none" style={{ color: m.color }}>
                  {m.value}{m.unit !== "kcal" ? m.unit : ""}
                </p>
                {m.unit === "kcal" && (
                  <p className="text-[9px] font-semibold text-dark/30 mt-0.5">kcal</p>
                )}
                <p className="text-[10px] text-dark/40 font-body mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Per 100g reference */}
          <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
            <p className="text-[10px] text-dark/25 font-body text-center">
              Per 100g: {food.kcalPer100g} kcal · {food.proteinPer100g}g P ·{" "}
              {food.carbsPer100g}g C · {food.fatsPer100g}g F
              {food.fiberPer100g != null ? ` · ${food.fiberPer100g}g fiber` : ""}
            </p>
          </div>
        </div>

        {/* Serving selector */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark/30 mb-3">Serving size</p>

          {/* Predefined servings */}
          <div className="flex flex-wrap gap-2 mb-3">
            {servings.map((s, i) => (
              <button
                key={i}
                onClick={() => { setServingIdx(i); setUseCustom(false); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={
                  !useCustom && servingIdx === i
                    ? { background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}99)`, color: "white" }
                    : { background: "var(--color-ghost)", color: "var(--color-text-mid)", border: "1px solid var(--color-border)" }
                }
              >
                {s.label} · {Math.round(s.grams * food.kcalPer100g / 100)} kcal
              </button>
            ))}
            <button
              onClick={() => { setUseCustom(true); setCustomGrams(String(Math.round(selectedG))); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={
                useCustom
                  ? { background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}99)`, color: "white" }
                  : { background: "var(--color-ghost)", color: "var(--color-text-mid)", border: "1px solid var(--color-border)" }
              }
            >
              Custom g
            </button>
          </div>

          {/* Custom gram input */}
          {useCustom && (
            <div className="flex items-center gap-3 mt-2">
              <input
                type="number"
                value={customGrams}
                onChange={e => setCustomGrams(e.target.value)}
                min="1"
                max="2000"
                step="5"
                className="flex-1 bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none text-center font-body border border-transparent focus:border-primary/30 transition-colors"
                autoFocus
              />
              <span className="text-sm font-semibold text-dark/40">grams</span>
            </div>
          )}
        </div>

        {/* Meal type selector */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark/30 mb-3">Meal</p>
          <div className="grid grid-cols-4 gap-2">
            {MEAL_TYPES.map(mt => (
              <button
                key={mt.value}
                onClick={() => setMealType(mt.value)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={
                  mealType === mt.value
                    ? { background: `${phaseColor}18`, color: phaseColor, border: `1px solid ${phaseColor}40` }
                    : { background: "var(--color-ghost)", color: "var(--color-text-mid)" }
                }
              >
                <span className="text-lg">{mt.emoji}</span>
                <span>{mt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-body px-1 mb-2">{error}</p>
        )}
      </div>

      {/* Sticky log button */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3"
        style={{ background: "var(--color-bg)", borderTop: "1px solid var(--color-border)" }}
      >
        <button
          onClick={handleLog}
          disabled={logging || logged}
          className="w-full py-4 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: logged
              ? "linear-gradient(135deg, #34D399, #10B981)"
              : `linear-gradient(135deg, ${phaseColor}, ${phaseColor}99)`,
          }}
        >
          {logged ? (
            <><span>✓</span><span>Logged!</span></>
          ) : logging ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Logging…</span></>
          ) : (
            <><span>+</span><span>Log {macros.kcal} kcal to {MEAL_TYPES.find(m => m.value === mealType)?.label}</span></>
          )}
        </button>
      </div>
    </div>
  );
}
