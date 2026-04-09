// lib/macroMatcher.ts
// Pure scoring utilities for "fill my remaining macros" feature.
// No async, no DB calls, no side effects — fully testable.

import type { Food } from "@/lib/nutrition";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MacroRemaining {
  protein: number;   // grams remaining (already clamped ≥ 0 at call site)
  carbs:   number;
  fats:    number;
  kcal:    number;
}

export interface ScoredFood {
  food:  Food;
  score: number;   // 0–1 composite match score
  fills: {         // what this meal provides at its default serving size
    protein: number;
    carbs:   number;
    fats:    number;
    kcal:    number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL-AWARE WEIGHT PROFILES
// Protein > Carbs > Fats as default — reflects clinical nutrition priority.
// ─────────────────────────────────────────────────────────────────────────────

interface MacroWeights { protein: number; carbs: number; fats: number; }

const DEFAULT_WEIGHTS: MacroWeights     = { protein: 0.45, carbs: 0.35, fats: 0.20 };
const WEIGHT_LOSS_WEIGHTS: MacroWeights = { protein: 0.55, carbs: 0.25, fats: 0.20 };
const MUSCLE_GAIN_WEIGHTS: MacroWeights = { protein: 0.60, carbs: 0.30, fats: 0.10 };

const WEIGHT_LOSS_GOALS  = ["lose weight", "weight loss", "fat loss", "cut", "cutting"];
const MUSCLE_GAIN_GOALS  = ["build muscle", "muscle gain", "bulk", "bulking", "gain muscle"];

function resolveWeights(userGoals: string[]): MacroWeights {
  const g = userGoals.map(s => s.toLowerCase());
  if (g.some(s => MUSCLE_GAIN_GOALS.includes(s))) return MUSCLE_GAIN_WEIGHTS;
  if (g.some(s => WEIGHT_LOSS_GOALS.includes(s)))  return WEIGHT_LOSS_WEIGHTS;
  return DEFAULT_WEIGHTS;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-MACRO FIT SCORE  (0–1)
//
// ratio = mealAmount / remaining
//
// 0.3 – 1.0   → 1.0      ideal: fills 30–100% of remaining
// 1.0 – 1.5   → penalty  mild overshoot (still useful)
// > 1.5        → harder penalty, floor 0.2 (large overshoot)
// < 0.3        → proportional (meal barely dents the gap)
// remaining ≤ 0 → 0.8    macro already met — any meal is tolerated, not rewarded
// ─────────────────────────────────────────────────────────────────────────────

function macroScore(mealAmount: number, remaining: number): number {
  if (remaining <= 0)   return 0.8;
  if (mealAmount <= 0)  return 0;

  const ratio = mealAmount / remaining;

  if (ratio >= 0.3 && ratio <= 1.0)  return 1.0;
  if (ratio > 1.0  && ratio <= 1.5)  return 1.0 - (ratio - 1.0) * 0.5;
  if (ratio > 1.5)                   return Math.max(0.2, 1.0 - (ratio - 1.0) * 0.25);
  return ratio / 0.3; // ratio < 0.3: proportional
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE A SINGLE MEAL against remaining macros
// ─────────────────────────────────────────────────────────────────────────────

export function scoreMeal(
  food: Food,
  remaining: MacroRemaining,
  userGoals: string[] = [],
): number {
  const g   = food.servingSizeG ?? 100;
  const f   = g / 100;
  const mP  = food.proteinPer100g * f;
  const mC  = food.carbsPer100g   * f;
  const mF  = food.fatsPer100g    * f;

  const w   = resolveWeights(userGoals);

  return (
    macroScore(mP, remaining.protein) * w.protein +
    macroScore(mC, remaining.carbs)   * w.carbs   +
    macroScore(mF, remaining.fats)    * w.fats
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GET TOP N MATCHES
// Returns foods sorted by score descending, with pre-computed fill values.
// ─────────────────────────────────────────────────────────────────────────────

export function getTopMatches(
  foods: Food[],
  remaining: MacroRemaining,
  userGoals: string[] = [],
  n = 3,
): ScoredFood[] {
  return foods
    .map(food => {
      const g   = food.servingSizeG ?? 100;
      const f   = g / 100;
      return {
        food,
        score: scoreMeal(food, remaining, userGoals),
        fills: {
          protein: Math.round(food.proteinPer100g * f),
          carbs:   Math.round(food.carbsPer100g   * f),
          fats:    Math.round(food.fatsPer100g    * f),
          kcal:    Math.round(food.kcalPer100g    * f),
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOULD SHOW BUTTON?
// Returns true when there is a meaningful macro gap worth filling.
// Thresholds avoid showing the button for trivial remaining amounts.
// ─────────────────────────────────────────────────────────────────────────────

export function hasMeaningfulRemaining(remaining: MacroRemaining): boolean {
  return (
    remaining.protein > 5  ||
    remaining.carbs   > 10 ||
    remaining.fats    > 3
  );
}
