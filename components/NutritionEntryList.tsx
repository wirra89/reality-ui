"use client";

// components/NutritionEntryList.tsx
// V1.1 component: displays today's meal_log_entries from the new relational table.
// Shows nutrition summary totals and per-entry list with delete.
// Coexists with legacy MealDailySummary during transition.

import { deleteMealEntry, type MealLogEntry, type NutritionSummary } from "@/lib/nutrition";

const MEAL_TYPE_STYLE: Record<string, { emoji: string; bg: string }> = {
  breakfast: { emoji: "🌅", bg: "rgba(251,191,36,0.1)"  },
  lunch:     { emoji: "☀️",  bg: "rgba(196,138,151,0.1)" },
  dinner:    { emoji: "🌙", bg: "rgba(123,109,141,0.1)"  },
  snack:     { emoji: "⚡", bg: "rgba(52,211,153,0.1)"   },
};

interface Props {
  entries: MealLogEntry[];
  summary: NutritionSummary | null;
  loading: boolean;
  onEntryDeleted: (deletedId: number) => void;
}

export default function NutritionEntryList({ entries, summary, loading, onEntryDeleted }: Props) {

  async function handleDelete(entry: MealLogEntry) {
    const result = await deleteMealEntry(entry.id);
    if (result.success) {
      onEntryDeleted(entry.id);
    }
  }

  if (loading) {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Logged today ✦
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
    );
  }

  // Show nothing if no entries and no summary — don't clutter UI before first log
  if (entries.length === 0 && (!summary || summary.entryCount === 0)) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
          Logged today ✦
        </p>
        {summary && summary.entryCount > 0 && (
          <p className="text-xs text-dark/40 font-body">
            {Math.round(summary.kcal)} kcal total
          </p>
        )}
      </div>

      {/* Nutrition summary bar */}
      {summary && summary.entryCount > 0 && (
        <div className="rounded-2xl p-3 mb-2"
          style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "kcal",    value: Math.round(summary.kcal),    color: "#C48A97" },
              { label: "Protein", value: `${Math.round(summary.protein)}g`, color: "#7B6D8D" },
              { label: "Carbs",   value: `${Math.round(summary.carbs)}g`,   color: "#F59E0B" },
              { label: "Fats",    value: `${Math.round(summary.fats)}g`,    color: "#34D399" },
            ].map(m => (
              <div key={m.label}>
                <p className="font-display font-bold text-sm text-white">{m.value}</p>
                <p className="text-xs font-body mt-0.5" style={{ color: m.color + "cc" }}>
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry list */}
      {entries.length > 0 && (
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
      )}
    </div>
  );
}
