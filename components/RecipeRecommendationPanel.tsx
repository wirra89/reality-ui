"use client";

// components/RecipeRecommendationPanel.tsx
// Shows top 3 engine-scored recipes from the static bowl/wrap dataset.
// Filters: bowls, wraps, high protein, post workout, low appetite, meal prep.

import { useMemo, useState } from "react";
import { RECIPES } from "@/lib/recipes";
import {
  recommendMeals,
  applyFilter,
  signalsFromDaily,
  type RecipeFilter,
  type ScoredMeal,
} from "@/lib/mealEngine";
import { logStaticRecipe, type MealType } from "@/lib/nutrition";
import type { DailySignals } from "@/lib/sharedSignals";
import type { Phase } from "@/lib/cycle";
import type { MealRecipe } from "@/lib/recipes";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  phase:        Phase;
  dailySignals: DailySignals | null;
  macroTargets?: {
    calories: number;
    protein:  number;
    carbs:    number;
    fats:     number;
  };
  cycleDay:  number;
  onLogged?: () => void;
}

// ── Filter config ─────────────────────────────────────────────────────────────

const FILTERS: { id: RecipeFilter; label: string }[] = [
  { id: "all",          label: "All"          },
  { id: "bowls",        label: "Bowls"        },
  { id: "wraps",        label: "Wraps"        },
  { id: "high_protein", label: "High Protein" },
  { id: "post_workout", label: "Post Workout" },
  { id: "low_appetite", label: "Low Appetite" },
  { id: "meal_prep",    label: "Meal Prep"    },
];

// ── Phase accent colour ───────────────────────────────────────────────────────

const PHASE_COLOR: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// ── Type badge colors ─────────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  bowl:        { bg: "rgba(59,130,246,0.10)",  color: "#3B82F6" },
  wrap:        { bg: "rgba(16,185,129,0.10)",  color: "#10B981" },
  soup:        { bg: "rgba(251,146,60,0.10)",  color: "#F97316" },
  breakfast:   { bg: "rgba(250,204,21,0.10)",  color: "#EAB308" },
  snack:       { bg: "rgba(244,114,182,0.10)", color: "#EC4899" },
  salad:       { bg: "rgba(52,211,153,0.10)",  color: "#34D399" },
  stir_fry:    { bg: "rgba(249,115,22,0.10)",  color: "#EA580C" },
  pasta_grain: { bg: "rgba(245,158,11,0.10)",  color: "#D97706" },
  smoothie:    { bg: "rgba(168,85,247,0.10)",  color: "#9333EA" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecipeRecommendationPanel({ phase, dailySignals, macroTargets, cycleDay, onLogged }: Props) {
  const [activeFilter, setActiveFilter] = useState<RecipeFilter>("all");
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [loggingId, setLoggingId]       = useState<string | null>(null);
  const [loggedIds, setLoggedIds]       = useState<Set<string>>(new Set());

  const color = PHASE_COLOR[phase];

  async function handleLog(recipe: MealRecipe) {
    if (loggedIds.has(recipe.id) || loggingId) return;
    setLoggingId(recipe.id);
    try {
      await logStaticRecipe(
        {
          name:      recipe.name,
          calories:  recipe.macros_per_serving.calories_kcal,
          protein_g: recipe.macros_per_serving.protein_g,
          carbs_g:   recipe.macros_per_serving.carbs_g,
          fat_g:     recipe.macros_per_serving.fat_g,
        },
        "snack" as MealType,
        cycleDay,
        phase,
      );
      setLoggedIds(prev => new Set(prev).add(recipe.id));
      onLogged?.();
    } finally {
      setLoggingId(null);
    }
  }

  // Bridge signals
  const mealSignals = useMemo(() =>
    signalsFromDaily(dailySignals, macroTargets ? {
      calories_kcal: macroTargets.calories,
      protein_g:     macroTargets.protein,
      carbs_g:       macroTargets.carbs,
      fat_g:         macroTargets.fats,
    } : undefined),
    [dailySignals, macroTargets],
  );

  // Apply filter then score
  const scoredMeals = useMemo((): ScoredMeal[] => {
    const pool = applyFilter(RECIPES, activeFilter);
    return recommendMeals(pool, mealSignals, 3);
  }, [activeFilter, mealSignals]);

  return (
    <div className="mb-4">

      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-base font-semibold text-dark">Recommended for you</h2>
        <span className="text-xs font-body" style={{ color: `${color}bb` }}>Engine-scored</span>
      </div>

      {/* Filter pills */}
      <div
        className="flex gap-1.5 pb-2 mb-3"
        style={{ overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => { setActiveFilter(f.id); setExpanded(null); }}
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

      {/* Recipe cards */}
      {scoredMeals.length === 0 ? (
        <div className="rounded-2xl p-4 text-center text-sm text-dark/40 font-body"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          No recipes match this filter for the {phase} phase.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {scoredMeals.map(({ recipe, reasons }, idx) => {
            const isOpen = expanded === recipe.id;
            const typeStyle = TYPE_STYLE[recipe.type];
            const ingredientList = Object.entries(recipe.ingredients_grams).map(
              ([item, g]) => `${item} (${g}g)`,
            );

            return (
              <div
                key={recipe.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderTop: idx === 0 ? `3px solid ${color}` : "1px solid var(--color-border)",
                  boxShadow: idx === 0 ? `0 4px 16px ${color}22` : "none",
                }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    {/* Type badge */}
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: typeStyle.bg, color: typeStyle.color }}
                    >
                      {recipe.type === "bowl" ? "🥣" : "🌯"} {recipe.type}
                    </span>
                    {/* Top pick badge */}
                    {idx === 0 && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}18`, color: `${color}cc` }}
                      >
                        Top pick
                      </span>
                    )}
                  </div>
                  {/* Prep time */}
                  <span className="text-xs font-body text-dark/40">
                    {recipe.prep_time_min} min · {recipe.difficulty}
                  </span>
                </div>

                {/* Name + reason */}
                <div className="px-4 pb-3">
                  <p className="font-display font-semibold text-sm text-dark mb-1 leading-snug">
                    {recipe.name}
                  </p>
                  {reasons[0] && (
                    <p className="text-xs font-body leading-snug" style={{ color: `${color}cc` }}>
                      {reasons[0]}
                      {reasons[1] && ` · ${reasons[1]}`}
                    </p>
                  )}
                </div>

                {/* Macro strip */}
                <div
                  className="mx-4 mb-3 px-3 py-2.5 rounded-xl grid grid-cols-4"
                  style={{ background: "var(--color-ghost)" }}
                >
                  {[
                    { label: "kcal",    value: `${recipe.macros_per_serving.calories_kcal}` },
                    { label: "protein", value: `${recipe.macros_per_serving.protein_g}g`    },
                    { label: "carbs",   value: `${recipe.macros_per_serving.carbs_g}g`      },
                    { label: "fat",     value: `${recipe.macros_per_serving.fat_g}g`        },
                  ].map(m => (
                    <div key={m.label} className="text-center">
                      <p className="text-dark font-semibold text-sm leading-none">{m.value}</p>
                      <p className="text-[var(--color-text-dim)] text-xs leading-none mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Functional tags */}
                <div className="px-4 pb-3 flex flex-wrap gap-1">
                  {recipe.functional_tags.slice(0, 4).map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--color-ghost)", color: "var(--color-text-mid)" }}
                    >
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>

                {/* Actions: log + view recipe */}
                <div className="flex gap-2 px-4 pb-4">
                  <button
                    onClick={() => handleLog(recipe)}
                    disabled={!!loggingId}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    style={{
                      background: loggedIds.has(recipe.id)
                        ? "rgba(0,0,0,0.04)"
                        : `linear-gradient(135deg, ${color}, ${color}88)`,
                      color: loggedIds.has(recipe.id) ? "var(--color-text-dim)" : "white",
                    }}
                  >
                    {loggingId === recipe.id ? (
                      <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Logging…</span></>
                    ) : loggedIds.has(recipe.id) ? (
                      <span>✓ Logged</span>
                    ) : (
                      <span>Log this meal</span>
                    )}
                  </button>
                  <button
                    onClick={() => setExpanded(isOpen ? null : recipe.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: isOpen ? `${color}22` : "rgba(0,0,0,0.04)",
                      color:      isOpen ? color : "var(--color-text-mid)",
                      border:     `1px solid ${isOpen ? color + "44" : "var(--color-border)"}`,
                    }}
                  >
                    <span>{isOpen ? "▲" : "▼"}</span>
                    <span>{isOpen ? "Hide" : "Recipe"}</span>
                  </button>
                </div>

                {/* Recipe accordion */}
                {isOpen && (
                  <div
                    className="mx-4 mb-4 rounded-xl px-4 py-3"
                    style={{ background: "var(--color-bg)", borderTop: `2px solid ${color}33` }}
                  >
                    {/* Ingredients */}
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                      Ingredients
                    </p>
                    <ul className="mb-4 space-y-1">
                      {ingredientList.map((ing, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-body text-[var(--color-text-mid)]">
                          <span className="mt-0.5 flex-shrink-0" style={{ color }}>•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Instructions */}
                    {recipe.instructions.length > 0 && (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: `${color}99` }}>
                          Preparation
                        </p>
                        <ol className="space-y-2">
                          {recipe.instructions.map((step, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs font-body text-[var(--color-text-mid)]">
                              <span
                                className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                                style={{ background: `${color}33`, color }}
                              >
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}

                    {/* Scaling tip */}
                    {recipe.scaling.scalable && recipe.scaling.macro_adjustment_rules[0] && (
                      <p
                        className="mt-3 text-xs font-body italic leading-relaxed"
                        style={{ color: "var(--color-text-dim)" }}
                      >
                        💡 {recipe.scaling.macro_adjustment_rules[0]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
