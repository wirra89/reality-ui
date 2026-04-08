"use client";

// components/MealRecommendationCards.tsx
// V1.1 — 4 phase-aware meal recommendation cards (breakfast/lunch/dinner/snack).
// One-tap "Log this" logs the food with default quantity (servingSizeG ?? 100g).

import { useState, useEffect } from "react";
import {
  getFoodsForPhase,
  pickMealRecommendations,
  logFood,
  calculateFoodSnapshot,
  type Food,
  type MealType,
  type Phase,
} from "@/lib/nutrition";

const MEAL_META: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: "Breakfast", icon: "☀️" },
  lunch:     { label: "Lunch",     icon: "🌤" },
  dinner:    { label: "Dinner",    icon: "🌙" },
  snack:     { label: "Snack",     icon: "🍎" },
};

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface Props {
  phase: Phase;
  cycleDay: number;
  onLogged: () => void;
}

export default function MealRecommendationCards({ phase, cycleDay, onLogged }: Props) {
  const [recs, setRecs]       = useState<Record<MealType, Food | null>>({
    breakfast: null, lunch: null, dinner: null, snack: null,
  });
  const [loading, setLoading] = useState(true);
  const [logged, setLogged]   = useState<Partial<Record<MealType, boolean>>>({});
  const [logging, setLogging] = useState<MealType | null>(null);

  useEffect(() => {
    setLoading(true);
    getFoodsForPhase(phase).then((phaseFoods) => {
      setRecs(pickMealRecommendations(phaseFoods, cycleDay));
      setLoading(false);
    });
  }, [phase, cycleDay]);

  async function handleLog(mealType: MealType) {
    const food = recs[mealType];
    if (!food || logging || logged[mealType]) return;
    setLogging(mealType);

    const quantity = food.servingSizeG ?? 100;
    const result = await logFood(food.id, quantity, mealType, cycleDay, phase);

    if (result.success) {
      setLogged(prev => ({ ...prev, [mealType]: true }));
      onLogged();
    }
    setLogging(null);
  }

  if (loading) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2.5">
          Today&apos;s Meal Ideas
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {MEAL_TYPES.map(t => (
            <div key={t} className="bg-white rounded-2xl shadow-card p-3.5 h-36 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2.5">
        Today&apos;s Meal Ideas
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        {MEAL_TYPES.map(mealType => {
          const food = recs[mealType];
          if (!food) return null;

          const meta       = MEAL_META[mealType];
          const isLogged   = !!logged[mealType];
          const isLogging  = logging === mealType;
          const qty        = food.servingSizeG ?? 100;
          const snap       = calculateFoodSnapshot(food, qty);

          return (
            <div
              key={mealType}
              className="bg-white rounded-2xl shadow-card p-3.5 flex flex-col gap-2">

              {/* Meal slot label */}
              <div className="flex items-center gap-1">
                <span className="text-xs">{meta.icon}</span>
                <span className="text-xs font-semibold text-dark/40 uppercase tracking-wide">
                  {meta.label}
                </span>
              </div>

              {/* Food */}
              <div className="flex items-start gap-2 flex-1 min-w-0">
                {food.emoji && (
                  <span className="text-2xl leading-none flex-shrink-0">{food.emoji}</span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-dark leading-tight truncate">
                    {food.name}
                  </p>
                  {food.keyNutrient && (
                    <p className="text-xs text-dark/40 font-body leading-snug mt-0.5 line-clamp-2">
                      {food.keyNutrient}
                    </p>
                  )}
                  <p className="text-xs text-dark/30 font-body mt-1">
                    ~{snap.kcal} kcal · {qty}g
                  </p>
                </div>
              </div>

              {/* Log button */}
              <button
                onClick={() => handleLog(mealType)}
                disabled={isLogged || isLogging}
                className="w-full py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-95 disabled:cursor-default"
                style={{
                  background: isLogged
                    ? "linear-gradient(135deg, #34D399, #10B981)"
                    : "linear-gradient(135deg, #C48A97, #7B6D8D)",
                  opacity: isLogging ? 0.7 : 1,
                }}>
                {isLogging ? "…" : isLogged ? "✓ Logged" : "Log this"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
