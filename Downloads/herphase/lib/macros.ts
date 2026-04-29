// lib/macros.ts
// Macro calculator using Mifflin-St Jeor formula

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type BodyGoal = "cut" | "recomposition" | "bulk";

export interface MacroInputs {
  heightCm: number;
  weightKg: number;
  age: number;
  activityLevel: ActivityLevel;
  bodyGoal: BodyGoal;
}

export interface MacroResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fats: number;      // grams
  deficit?: number;  // kcal below TDEE
  surplus?: number;  // kcal above TDEE
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,   // desk job, no exercise
  light:       1.375, // 1-3 days/week
  moderate:    1.55,  // 3-5 days/week
  active:      1.725, // 6-7 days/week
  very_active: 1.9,   // twice/day or physical job
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   "Sedentary — desk job, little movement",
  light:       "Light — 1-3 workouts/week",
  moderate:    "Moderate — 3-5 workouts/week",
  active:      "Active — 6-7 workouts/week",
  very_active: "Very Active — twice/day or physical job",
};

export const GOAL_LABELS: Record<BodyGoal, { label: string; emoji: string; description: string }> = {
  cut:           { label: "Cut", emoji: "🔥", description: "Lose fat, maintain muscle" },
  recomposition: { label: "Recomposition", emoji: "⚖️", description: "Lose fat & build muscle simultaneously" },
  bulk:          { label: "Bulk", emoji: "💪", description: "Build muscle, some fat gain acceptable" },
};

export function calculateMacros(inputs: MacroInputs): MacroResult {
  const { heightCm, weightKg, age, activityLevel, bodyGoal } = inputs;

  // Mifflin-St Jeor BMR for women
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);

  // TDEE
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);

  // Target calories by goal
  let targetCalories: number;
  let deficit: number | undefined;
  let surplus: number | undefined;

  if (bodyGoal === "cut") {
    deficit = Math.round(tdee * 0.20); // 20% deficit
    targetCalories = tdee - deficit;
  } else if (bodyGoal === "bulk") {
    surplus = Math.round(tdee * 0.10); // 10% surplus (lean bulk)
    targetCalories = tdee + surplus;
  } else {
    // Recomposition — slight deficit
    deficit = Math.round(tdee * 0.05);
    targetCalories = tdee - deficit;
  }

  // Protein — evidence-based for women (1.6-2.0g/kg optimal range)
  const proteinMultiplier = bodyGoal === "bulk" ? 1.9 : bodyGoal === "cut" ? 1.8 : 1.7;
  const protein = Math.round(weightKg * proteinMultiplier);

  // Fats — minimum 20% of calories
  const fats = Math.round((targetCalories * 0.25) / 9);

  // Carbs — remaining calories
  const carbCals = targetCalories - protein * 4 - fats * 9;
  const carbs = Math.max(50, Math.round(carbCals / 4));

  return { bmr, tdee, targetCalories, protein, carbs, fats, deficit, surplus };
}
