"use client";

// components/NutritionEntryList.tsx
// V1.1 component: displays macro progress (consumed vs target) and
// today's meal_log_entries from the new relational table.

import { deleteMealEntry, type MealLogEntry, type NutritionSummary } from "@/lib/nutrition";

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
  entries: MealLogEntry[];
  summary: NutritionSummary | null;
  loading: boolean;
  onEntryDeleted: (deletedId: number) => void;
  macroTargets?: MacroTargets;
  phase?: string;
}

export default function NutritionEntryList({
  entries,
  summary,
  loading,
  onEntryDeleted,
  macroTargets,
  phase,
}: Props) {
  const phaseColor = PHASE_COLOR[phase ?? ""] ?? "#C48A97";

  async function handleDelete(entry: MealLogEntry) {
    const result = await deleteMealEntry(entry.id);
    if (result.success) onEntryDeleted(entry.id);
  }

  // ── Macro progress card (always rendered once loaded) ──────────────────────

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

  function remaining(value: number, target: number) {
    return Math.max(0, target - value);
  }

  const macroRows = [
    { label: "Protein", consumed: consumed.protein, target: targets.protein, unit: "g" },
    { label: "Carbs",   consumed: consumed.carbs,   target: targets.carbs,   unit: "g" },
    { label: "Fats",    consumed: consumed.fats,    target: targets.fats,    unit: "g" },
  ];

  const kcalPct    = pct(consumed.calories, targets.calories);
  const kcalDone   = consumed.calories >= targets.calories;
  const hasEntries = entries.length > 0;

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
          {macroTargets && (
            <span className="text-xs font-body" style={{ color: `${phaseColor}99` }}>
              Phase targets
            </span>
          )}
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
            <span
              className="text-xs font-semibold"
              style={{ color: kcalDone ? "#34D399" : phaseColor }}
            >
              {kcalDone ? "✓ Goal reached" : `${remaining(consumed.calories, targets.calories).toLocaleString()} left`}
            </span>
          </div>
          {/* Calorie progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${kcalPct}%`,
                background: kcalDone
                  ? "#34D399"
                  : `linear-gradient(90deg, ${phaseColor}cc, ${phaseColor})`,
              }}
            />
          </div>
        </div>

        {/* Protein / Carbs / Fats rows */}
        <div className="space-y-2">
          {macroRows.map(m => {
            const p    = pct(m.consumed, m.target);
            const done = m.consumed >= m.target;
            return (
              <div key={m.label} className="flex items-center gap-2.5">
                {/* Label */}
                <p className="text-white/50 text-xs w-12 flex-shrink-0">{m.label}</p>
                {/* Bar */}
                <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${p}%`,
                      background: done ? "#34D399" : phaseColor,
                      opacity: 0.85,
                    }}
                  />
                </div>
                {/* Consumed / target */}
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
      </div>

      {/* ── Logged entries list ── */}
      {hasEntries && (
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
