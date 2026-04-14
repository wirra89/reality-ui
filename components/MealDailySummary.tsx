"use client";

// components/MealDailySummary.tsx
import { type MealEntry } from "@/lib/supabase";
import { type PhaseData } from "@/lib/cycle";
import { MEAL_TYPE_LABELS, type MealType } from "@/lib/foods";
import { type Profile } from "@/lib/supabase";

import { type ReactNode } from "react";

interface Props {
  meals: MealEntry[];
  phaseData: PhaseData;
  profile: Profile | null;
  onRemove: (idx: number) => void;
  dataLoading: boolean;
  logButton?: ReactNode;
}

export default function MealDailySummary({ meals, phaseData, profile, onRemove, dataLoading, logButton }: Props) {
  const macroGoals = {
    protein:  profile?.calculated_protein  ?? phaseData.macros.protein,
    carbs:    profile?.calculated_carbs    ?? phaseData.macros.carbs,
    fats:     profile?.calculated_fats     ?? phaseData.macros.fats,
    calories: profile?.calculated_calories ?? (phaseData.macros.protein * 4 + phaseData.macros.carbs * 4 + phaseData.macros.fats * 9),
  };
  const hasCustomMacros = !!(profile?.calculated_calories);

  const totalCalories = meals.reduce((a, m) => a + (parseFloat(m.calories) || 0), 0);
  const totalProtein  = meals.reduce((a, m) => a + (parseFloat(m.protein)  || 0), 0);
  const totalCarbs    = meals.reduce((a, m) => a + (parseFloat(m.carbs)    || 0), 0);
  const totalFats     = meals.reduce((a, m) => a + (parseFloat(m.fats)     || 0), 0);

  return (
    <>
      {/* Macro summary */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/50 text-xs font-body">Today's intake</p>
            <p className="text-white font-display font-bold text-2xl">{totalCalories > 0 ? `${totalCalories} kcal` : "— kcal"}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl">{phaseData.emoji}</span>
            {hasCustomMacros && <p className="text-white/40 text-xs font-body mt-0.5">Custom macros ✓</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Protein", value: totalProtein, goal: macroGoals.protein, color: "#C48A97" },
            { label: "Carbs",   value: totalCarbs,   goal: macroGoals.carbs,   color: "#EDD5DB" },
            { label: "Fats",    value: totalFats,    goal: macroGoals.fats,    color: "#A78BFA" },
          ].map(m => {
            const pct = Math.min(100, (m.value / m.goal) * 100);
            const done = m.value >= m.goal;
            return (
              <div key={m.label} className="text-center">
                <p className="text-white font-display font-bold text-base">{Math.round(m.value)}g</p>
                <p className="text-white/40 text-xs font-body">/ {m.goal}g {m.label}</p>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: done ? "#34D399" : m.color }} />
                </div>
              </div>
            );
          })}
        </div>
        {totalCalories > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wide font-semibold mb-2">Remaining today</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Protein", remaining: macroGoals.protein - totalProtein, color: "#C48A97" },
                { label: "Carbs",   remaining: macroGoals.carbs   - totalCarbs,   color: "#EDD5DB" },
                { label: "Fats",    remaining: macroGoals.fats    - totalFats,    color: "#A78BFA" },
              ].map(m => {
                const done = m.remaining <= 0;
                return (
                  <div key={m.label} className="text-center">
                    <p className="text-sm font-bold" style={{ color: done ? "#34D399" : m.color }}>
                      {done ? "✓" : `${Math.max(0, Math.round(m.remaining))}g`}
                    </p>
                    <p className="text-white/30 text-xs">{done ? "Done!" : `${m.label} left`}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Log Custom Meal button slot — between macros and logged meals */}
      {logButton}

      {/* Logged meals */}
      {!dataLoading && meals.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2.5 px-1">Logged today</p>
          <div className="space-y-2">
            {meals.map((meal, idx) => {
              const style = MEAL_TYPE_LABELS[meal.mealType as MealType] ?? MEAL_TYPE_LABELS.snack;
              return (
                <div key={idx} className="bg-surface rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: style.bg }}>{style.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark font-semibold text-sm truncate">{meal.name}</p>
                    <p className="text-dark/40 text-xs font-body">
                      {meal.time}{meal.calories ? ` · ${meal.calories} kcal` : ""}{meal.protein ? ` · ${meal.protein}g P` : ""}
                    </p>
                  </div>
                  <button onClick={() => onRemove(idx)}
                    className="text-dark/20 hover:text-rose-400 transition-colors text-lg leading-none">×</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
