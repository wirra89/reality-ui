"use client";

// components/NutritionEntryList.tsx
// V1.1: macro progress card (consumed vs target), "fill my remaining macros"
// button with inline top-3 suggestions, and today's logged entries list.

import { useState } from "react";
import { deleteMealEntry, logFood, type MealLogEntry, type NutritionSummary, type Phase } from "@/lib/nutrition";
import { getTopMatches, hasMeaningfulRemaining, type MacroRemaining, type ScoredFood } from "@/lib/macroMatcher";
import { RECIPE_DETAILS } from "@/lib/recipeDetails";
import type { Food } from "@/lib/nutrition";

// ─────────────────────────────────────────────────────────────────────────────

const MEAL_TYPE_STYLE: Record<string, { emoji: string; bg: string }> = {
  breakfast: { emoji: "🌅", bg: "rgba(251,191,36,0.1)"  },
  lunch:     { emoji: "☀️",  bg: "rgba(196,138,151,0.1)" },
  dinner:    { emoji: "🌙", bg: "rgba(123,109,141,0.1)"  },
  snack:     { emoji: "⚡", bg: "rgba(52,211,153,0.1)"   },
};

const PHASE_COLOR: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

export interface MacroTargets {
  calories: number;
  protein:  number;
  carbs:    number;
  fats:     number;
}

interface Props {
  entries:            MealLogEntry[];
  summary:            NutritionSummary | null;
  loading:            boolean;
  onEntryDeleted:     (deletedId: number) => void;
  onLogged?:          () => void;
  macroTargets?:      MacroTargets;
  macroRemaining?:    MacroRemaining;
  phase?:             string;
  phaseFoods?:        Food[];
  userGoals?:         string[];
  mealFocusHeadline?: string | null;
  cycleDay?:          number;
}

export default function NutritionEntryList({
  entries,
  summary,
  loading,
  onEntryDeleted,
  onLogged,
  macroTargets,
  macroRemaining,
  phase,
  phaseFoods,
  userGoals = [],
  mealFocusHeadline,
  cycleDay = 1,
}: Props) {
  const phaseColor = PHASE_COLOR[phase ?? ""] ?? "#C48A97";

  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [expandedId, setExpandedId]               = useState<string | null>(null);
  const [loggingId, setLoggingId]                 = useState<string | null>(null);
  const [loggedIds, setLoggedIds]                 = useState<Set<string>>(new Set());

  // ── Computed values ────────────────────────────────────────────────────────

  const consumed = {
    calories: Math.round(summary?.kcal    ?? 0),
    protein:  Math.round(summary?.protein ?? 0),
    carbs:    Math.round(summary?.carbs   ?? 0),
    fats:     Math.round(summary?.fats    ?? 0),
  };

  const targets = macroTargets ?? { calories: 2000, protein: 130, carbs: 220, fats: 65 };

  function pct(value: number, target: number) {
    return Math.min(100, target > 0 ? (value / target) * 100 : 0);
  }

  const macroRows = [
    { label: "Protein", consumed: consumed.protein, target: targets.protein, unit: "g" },
    { label: "Carbs",   consumed: consumed.carbs,   target: targets.carbs,   unit: "g" },
    { label: "Fats",    consumed: consumed.fats,    target: targets.fats,    unit: "g" },
  ];

  const kcalPct  = pct(consumed.calories, targets.calories);
  const kcalDone = consumed.calories >= targets.calories;

  // Top matches — computed on demand (instant, pure math)
  const remaining = macroRemaining ?? { protein: 0, carbs: 0, fats: 0, kcal: 0 };
  const canSuggest = !!(phaseFoods?.length) && hasMeaningfulRemaining(remaining);
  const topMatches: ScoredFood[] = showSuggestions && phaseFoods?.length
    ? getTopMatches(phaseFoods, remaining, userGoals, 3)
    : [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleDelete(entry: MealLogEntry) {
    const result = await deleteMealEntry(entry.id);
    if (result.success) onEntryDeleted(entry.id);
  }

  async function handleLogSuggestion(food: Food) {
    setLoggingId(food.id);
    const qty = food.servingSizeG ?? 100;
    await logFood(food.id, qty, "snack", cycleDay, (phase ?? "luteal") as Phase);
    setLoggingId(null);
    setLoggedIds(prev => new Set(prev).add(food.id));
    onLogged?.();
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mb-4">
        <div className="rounded-2xl p-4 animate-pulse"
          style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
          <div className="h-3 bg-white/10 rounded w-1/3 mb-3" />
          <div className="h-8 bg-white/10 rounded mb-3 w-2/3" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2.5 bg-white/10 rounded w-12" />
                <div className="flex-1 h-1.5 bg-white/10 rounded-full" />
                <div className="h-2.5 bg-white/10 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mb-4">

      {/* ── Macro progress card ── */}
      <div className="rounded-2xl p-4 mb-3"
        style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
            Today&apos;s macros
          </p>
          <span className="text-xs font-body" style={{ color: `${phaseColor}99` }}>
            {macroTargets ? "Phase targets" : "Default targets"}
          </span>
        </div>

        {/* Calories — prominent row */}
        <div className="mb-3">
          <div className="flex items-end justify-between mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-display font-bold text-2xl leading-none">
                {consumed.calories > 0 ? consumed.calories.toLocaleString() : "—"}
              </span>
              <span className="text-white/40 text-sm font-body leading-none">
                / {targets.calories.toLocaleString()} kcal
              </span>
            </div>
            <span className="text-xs font-semibold"
              style={{ color: kcalDone ? "#34D399" : phaseColor }}>
              {kcalDone
                ? "✓ Goal reached"
                : `${Math.max(0, targets.calories - consumed.calories).toLocaleString()} kcal left`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${kcalPct}%`,
                background: kcalDone
                  ? "#34D399"
                  : `linear-gradient(90deg, ${phaseColor}cc, ${phaseColor})`,
              }} />
          </div>
        </div>

        {/* Protein / Carbs / Fats rows */}
        <div className="space-y-2 mb-3">
          {macroRows.map(m => {
            const p    = pct(m.consumed, m.target);
            const done = m.consumed >= m.target;
            return (
              <div key={m.label} className="flex items-center gap-2.5">
                <p className="text-white/50 text-xs w-12 flex-shrink-0">{m.label}</p>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${p}%`,
                      background: done ? "#34D399" : phaseColor,
                      opacity: 0.85,
                    }} />
                </div>
                <p className="text-xs font-semibold text-right flex-shrink-0 w-20"
                  style={{ color: done ? "#34D399" : "rgba(255,255,255,0.6)" }}>
                  {done
                    ? `✓ ${m.consumed}${m.unit}`
                    : `${m.consumed} / ${m.target}${m.unit}`}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── "Fill my remaining macros" button ── */}
        {canSuggest && (
          <button
            onClick={() => setShowSuggestions(s => !s)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              background: showSuggestions ? `${phaseColor}22` : "rgba(255,255,255,0.07)",
              color: showSuggestions ? phaseColor : "rgba(255,255,255,0.7)",
              border: `1px solid ${showSuggestions ? phaseColor + "44" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <span>🧠</span>
            <span>{showSuggestions ? "Hide suggestions" : "Fill my remaining macros"}</span>
          </button>
        )}

        {/* ── Inline top-3 suggestions ── */}
        {showSuggestions && topMatches.length > 0 && (
          <div className="mt-3 space-y-2">
            {/* Context label */}
            <p className="text-xs font-body"
              style={{ color: `${phaseColor}99` }}>
              {mealFocusHeadline
                ? `Based on your ${mealFocusHeadline} focus:`
                : "Best matches for your remaining macros:"}
            </p>

            {topMatches.map(({ food, score, fills }, i) => {
              const recipe    = RECIPE_DETAILS[food.externalId ?? ""];
              const isExpanded = expandedId === food.id;
              const isLogging  = loggingId  === food.id;
              const isLogged   = loggedIds.has(food.id);
              const matchPct   = Math.round(score * 100);

              return (
                <div key={food.id}
                  className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(0,0,0,0.25)", border: `1px solid rgba(255,255,255,0.07)` }}>

                  {/* Row header */}
                  <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
                    <span className="text-xl flex-shrink-0">{food.emoji ?? "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {i === 0 && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: `${phaseColor}33`, color: phaseColor }}>
                            Best match
                          </span>
                        )}
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                          {matchPct}%
                        </span>
                      </div>
                      <p className="text-white font-semibold text-sm leading-snug truncate">
                        {food.name}
                      </p>
                    </div>
                  </div>

                  {/* Fills summary */}
                  <div className="flex items-center gap-3 px-3 pb-2">
                    <p className="text-xs font-body" style={{ color: `${phaseColor}bb` }}>
                      fills ~{fills.protein}g P · {fills.carbs}g C · {fills.fats}g F · {fills.kcal} kcal
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      onClick={() => !isLogged && handleLogSuggestion(food)}
                      disabled={isLogging}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
                      style={{
                        background: isLogged
                          ? "rgba(255,255,255,0.06)"
                          : `linear-gradient(135deg, ${phaseColor}, ${phaseColor}88)`,
                        color: isLogged ? "rgba(255,255,255,0.4)" : "white",
                      }}
                    >
                      {isLogging ? "Logging…" : isLogged ? "✓ Logged" : "Log this"}
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : food.id)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: isExpanded ? `${phaseColor}22` : "rgba(255,255,255,0.06)",
                        color: isExpanded ? phaseColor : "rgba(255,255,255,0.5)",
                        border: `1px solid ${isExpanded ? phaseColor + "33" : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {isExpanded ? "▲" : "▼"} Recipe
                    </button>
                  </div>

                  {/* Recipe accordion */}
                  {isExpanded && !recipe && (
                    <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg text-center"
                      style={{ background: "rgba(0,0,0,0.2)", borderTop: `1px solid ${phaseColor}22` }}>
                      <p className="text-xs font-body" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Recipe coming soon
                      </p>
                    </div>
                  )}
                  {isExpanded && recipe && (
                    <div className="mx-3 mb-3 px-3 py-2.5 rounded-lg space-y-2"
                      style={{ background: "rgba(0,0,0,0.2)", borderTop: `1px solid ${phaseColor}22` }}>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: `${phaseColor}88` }}>
                          Ingredients
                        </p>
                        <ul className="space-y-0.5">
                          {recipe.ingredients.map((ing, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-white/65 font-body">
                              <span style={{ color: phaseColor }} className="flex-shrink-0 mt-0.5">•</span>
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                          style={{ color: `${phaseColor}88` }}>
                          Preparation
                        </p>
                        <ol className="space-y-1">
                          {recipe.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-white/65 font-body">
                              <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ background: `${phaseColor}30`, color: phaseColor }}>
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Logged entries list ── */}
      {entries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2.5 px-1">
            Logged today ✦
          </p>
          <div className="space-y-2">
            {entries.map(entry => {
              const style = MEAL_TYPE_STYLE[entry.mealType] ?? MEAL_TYPE_STYLE.snack;
              const sourceLabel = entry.entrySource === "legacy_snapshot"
                ? "imported"
                : entry.entrySource === "recipe"
                ? `${entry.servingsConsumed} srv`
                : `${entry.quantityG}g`;

              return (
                <div key={entry.id}
                  className="bg-white rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: style.bg }}>
                    {style.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark font-semibold text-sm truncate">{entry.name}</p>
                    <p className="text-dark/40 text-xs font-body">
                      {sourceLabel} · {Math.round(entry.kcal)} kcal
                      {entry.protein > 0 && ` · ${entry.protein}g P`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(entry)}
                    className="text-dark/20 hover:text-rose-400 transition-colors text-lg leading-none flex-shrink-0"
                    aria-label="Remove entry">
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
