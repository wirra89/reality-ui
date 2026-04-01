// lib/dailyPlan.ts
// Central daily plan engine for HerPhase V1.
// Generates a TodayState object from phase, cycle data, and optional check-in.
// Pure TypeScript — no DB calls, no side effects. Safe to call anywhere.

import { type Phase, type CycleParams, getPhaseData } from "@/lib/cycle";

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckInSnapshot {
  mood: number;          // 1–5
  energy: number;        // 1–5
  symptoms: string[];    // e.g. ["Cramps", "Bloating"]
  sleep_hours?: number;  // e.g. 7.5
  sleep_quality?: number; // 1–5
  cravings?: string[];   // e.g. ["Sweet", "Salty"] — added in Tier 1 migration
}

export interface DailyPlanInput {
  phase: Phase;
  cycleDay: number;
  cycleParams?: CycleParams;
  checkin?: CheckInSnapshot | null;   // today's or yesterday's check-in
  userGoals?: string[];               // from profiles.goals
  recentWorkoutCount?: number;        // workouts in last 7 days (for context)
  logCount?: number;                  // total mood log count (for data maturity)
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT TYPE — TodayState
// ─────────────────────────────────────────────────────────────────────────────

export type ReadinessLabel = "rest" | "moderate" | "good" | "peak";
export type WorkoutIntensity = "recovery" | "light" | "moderate" | "high" | "peak";
export type DataMaturityStage = "generic" | "early" | "personalized";

export interface WorkoutRecommendation {
  type: string;           // e.g. "Heavy Strength", "Recovery & Mobility"
  intensity: WorkoutIntensity;
  duration: number;       // minutes
  reasoning: string;      // why this recommendation was generated
  exercises?: string[];   // optional phase-appropriate exercise suggestions
}

export interface MealFocus {
  headline: string;       // e.g. "Iron + Anti-inflammatory"
  reasoning: string;      // science-backed explanation
  macroAdjustment?: string; // e.g. "+200 kcal today for high output"
  suggestedFoods?: string[]; // emoji + name strings, e.g. ["🥩 Red meat", "🫘 Lentils"]
}

export interface TodayState {
  readinessScore: number;           // 0–100 computed value
  readinessLabel: ReadinessLabel;
  workoutRecommendation: WorkoutRecommendation;
  mealFocus: MealFocus;
  insightTitle: string;
  insightBody: string;
  dataMaturityStage: DataMaturityStage;
  adaptedFromCheckin: boolean;      // true if check-in data influenced the output
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

// Phase baseline readiness — structural hormonal context (0-100)
const PHASE_BASE: Record<Phase, number> = {
  menstrual:  40,
  follicular: 70,
  ovulation:  92,
  luteal:     58,
};

// Penalty per symptom (max ~5 symptoms before plateauing)
const SYMPTOM_PENALTY = 7;
const MAX_SYMPTOM_PENALTY = 35;

// ─────────────────────────────────────────────────────────────────────────────
// READINESS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps sleep hours to a 0-100 normalised score.
 * Evidence-based: <5h = severely impaired recovery, 7-9h = optimal.
 */
function normaliseSleepHours(hours: number): number {
  if (hours < 4)   return 10;
  if (hours < 5)   return 25;
  if (hours < 6)   return 45;
  if (hours < 7)   return 62;
  if (hours < 8)   return 80;
  if (hours < 9)   return 92;
  return 88; // >9h can indicate illness or fatigue, slight regression
}

/**
 * Maps a 1–5 scale value to 0–100.
 */
function normaliseFiveScale(value: number): number {
  return Math.round(((value - 1) / 4) * 100);
}

/**
 * Computes readiness score (0–100) from phase baseline + optional check-in.
 *
 * Weights when check-in exists:
 *   phase baseline: 30%
 *   energy:         30%  ← highest, most direct proxy for workout readiness
 *   mood:           25%  ← overall state
 *   sleep:          15%  ← recovery signal
 *   symptom penalty applied after weighted sum
 *
 * Without check-in: returns phase baseline only.
 */
export function calcReadinessScore(
  phase: Phase,
  checkin?: CheckInSnapshot | null
): number {
  const base = PHASE_BASE[phase];

  if (!checkin) return base;

  const moodNorm   = normaliseFiveScale(checkin.mood);
  const energyNorm = normaliseFiveScale(checkin.energy);

  // Sleep score — prefer quality if both present, fall back to hours
  let sleepScore = base; // default to phase base if no sleep data
  if (checkin.sleep_quality != null) {
    sleepScore = normaliseFiveScale(checkin.sleep_quality);
  } else if (checkin.sleep_hours != null) {
    sleepScore = normaliseSleepHours(checkin.sleep_hours);
  }

  // Symptom penalty — capped to prevent extreme scores
  const penalty = Math.min(
    (checkin.symptoms?.length ?? 0) * SYMPTOM_PENALTY,
    MAX_SYMPTOM_PENALTY
  );

  const weighted =
    base        * 0.30 +
    energyNorm  * 0.30 +
    moodNorm    * 0.25 +
    sleepScore  * 0.15;

  return Math.round(Math.max(0, Math.min(100, weighted - penalty)));
}

/**
 * Maps a numeric readiness score to a human-readable label.
 */
export function getReadinessLabel(score: number): ReadinessLabel {
  if (score >= 80) return "peak";
  if (score >= 60) return "good";
  if (score >= 40) return "moderate";
  return "rest";
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────

interface WorkoutRule {
  type: string;
  intensity: WorkoutIntensity;
  duration: number;
  reasoning: string;
  exercises: string[];
}

/**
 * Rule table: readinessLabel × phase → workout recommendation.
 * Menstrual phase is soft-capped — even peak readiness doesn't push heavy.
 * This reflects the real risk of injury and fatigue during menstruation.
 */
const WORKOUT_RULES: Record<ReadinessLabel, Record<Phase, WorkoutRule>> = {
  rest: {
    menstrual:  { type: "Gentle Recovery", intensity: "recovery", duration: 20, reasoning: "Your body is in active menstruation and readiness is low. Gentle movement reduces cramping and clears prostaglandins without depleting your system.", exercises: ["Light walking", "Yin yoga", "Breathing exercises", "Foam rolling"] },
    follicular: { type: "Active Recovery", intensity: "recovery", duration: 25, reasoning: "Rising oestrogen but readiness signals are low today — likely from poor sleep or low mood. Gentle movement is better than rest for your hormonal environment right now.", exercises: ["Walking", "Light yoga", "Mobility work", "Swimming"] },
    ovulation:  { type: "Active Recovery", intensity: "recovery", duration: 25, reasoning: "Even at peak phase, your body is signalling it needs rest today. Honour the signals — a recovery session now prevents a longer setback.", exercises: ["Light yoga", "Walking", "Foam rolling", "Stretching"] },
    luteal:     { type: "Restorative Movement", intensity: "recovery", duration: 20, reasoning: "Progesterone is dominant and your readiness is low — this is your body asking for rest. Gentle movement supports mood without taxing your system.", exercises: ["Yin yoga", "Walking", "Gentle stretching", "Light Pilates"] },
  },
  moderate: {
    menstrual:  { type: "Light Mobility", intensity: "light", duration: 30, reasoning: "Some energy is returning. Light movement with a focus on mobility reduces cramp intensity and improves mood through endorphin release without spiking inflammation.", exercises: ["Hip mobility", "Core breathing", "Light walk", "Gentle stretching"] },
    follicular: { type: "Moderate Strength", intensity: "moderate", duration: 40, reasoning: "Oestrogen is rising — your body responds well to strength work even on moderate days. Focus on form and controlled volume rather than max weight.", exercises: ["Dumbbell compound lifts", "Bodyweight squats", "Resistance bands", "Core work"] },
    ovulation:  { type: "Moderate HIIT or Strength", intensity: "moderate", duration: 40, reasoning: "You're in a high-output phase but check-in signals moderate readiness. A controlled strength session or moderate HIIT captures the phase advantage without overreaching.", exercises: ["Barbell lifts at 70–75%", "Sprint intervals", "Compound movements", "Kettlebell circuits"] },
    luteal:     { type: "Zone 2 Cardio", intensity: "moderate", duration: 35, reasoning: "Progesterone elevates body temperature — Zone 2 cardio is the sweet spot. Enough intensity to maintain fitness without spiking cortisol or worsening PMS symptoms.", exercises: ["Steady-state cycling", "Incline walking", "Swimming", "Light jog"] },
  },
  good: {
    menstrual:  { type: "Light–Moderate Strength", intensity: "light", duration: 35, reasoning: "Good energy despite menstruation — take advantage but stay conservative. Focus on upper body or low-impact strength that doesn't require bracing through cramps.", exercises: ["Upper body dumbbell work", "Lat pulldowns", "Seated rows", "Light leg press"] },
    follicular: { type: "Progressive Strength", intensity: "high", duration: 50, reasoning: "Rising oestrogen + good readiness = your best window for progressive overload. Add weight, reduce rest, or increase volume today. Recovery is faster than any other phase.", exercises: ["Barbell squats", "Deadlifts", "Bench press", "Pull-ups"] },
    ovulation:  { type: "Heavy Strength + HIIT", intensity: "high", duration: 55, reasoning: "Peak phase + good readiness. Oestrogen and testosterone are both elevated — your body is optimised for strength AND power. Schedule your hardest session here.", exercises: ["Max weight compound lifts", "HIIT intervals", "Olympic lifts", "Sprint work"] },
    luteal:     { type: "Moderate Strength or Pilates", intensity: "moderate", duration: 45, reasoning: "Good readiness in luteal — you can train effectively. Keep intensity moderate, focus on consistency and connection. Pilates and strength both work well.", exercises: ["Pilates", "Moderate strength circuits", "Resistance bands", "Core stability"] },
  },
  peak: {
    menstrual:  { type: "Light–Moderate Strength", intensity: "moderate", duration: 40, reasoning: "Peak readiness but you're in menstruation — a soft cap applies. Upper body or seated work can be more challenging today. Avoid heavy bracing movements that increase intra-abdominal pressure.", exercises: ["Upper body strength", "Seated leg press", "Cable machine work", "Light compound lifts"] },
    follicular: { type: "Heavy Strength — New Movements", intensity: "peak", duration: 60, reasoning: "Peak readiness + rising oestrogen = your best opportunity to attempt new movements or heavy personal records. Your brain is more receptive to motor learning and your body to strength gains.", exercises: ["New lift technique", "Heavy compound lifts", "High-volume work", "Plyometrics"] },
    ovulation:  { type: "PR Attempt Day", intensity: "peak", duration: 60, reasoning: "This is your superpower window. Peak oestrogen + testosterone + peak readiness signals = attempt personal records. Research shows women are up to 10% stronger at ovulation.", exercises: ["1RM attempts", "Sprint PRs", "Max HIIT", "Heavy compound lifts"] },
    luteal:     { type: "Strength + Cardio Combo", intensity: "high", duration: 50, reasoning: "Peak readiness in luteal is a good sign — your body is handling the phase well. A strength + cardio combo maintains your fitness base without overcooking cortisol.", exercises: ["Compound strength lifts", "Moderate HIIT finisher", "Circuit training", "Cycling intervals"] },
  },
};

function getWorkoutRecommendation(
  phase: Phase,
  label: ReadinessLabel
): WorkoutRecommendation {
  const rule = WORKOUT_RULES[label][phase];
  return {
    type: rule.type,
    intensity: rule.intensity,
    duration: rule.duration,
    reasoning: rule.reasoning,
    exercises: rule.exercises,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MEAL FOCUS
// ─────────────────────────────────────────────────────────────────────────────

interface MealBaseRule {
  headline: string;
  reasoning: string;
  suggestedFoods: string[];
}

const MEAL_BASE: Record<Phase, MealBaseRule> = {
  menstrual: {
    headline: "Iron + Anti-inflammatory",
    reasoning: "You're losing iron through bleeding. Anti-inflammatory foods reduce prostaglandins — the compounds causing cramps. Omega-3s from fatty fish and walnuts are particularly effective.",
    suggestedFoods: ["🥩 Red meat or lentils", "🐟 Salmon or sardines", "🫐 Dark berries", "🥬 Leafy greens", "🍫 Dark chocolate (70%+)"],
  },
  follicular: {
    headline: "Performance Fuelling",
    reasoning: "Rising oestrogen improves insulin sensitivity — your body uses carbohydrates more efficiently now. Complex carbs fuel strength gains, lean protein supports muscle synthesis.",
    suggestedFoods: ["🍗 Chicken or turkey", "🌾 Oats or brown rice", "🥚 Eggs", "🫐 Fresh berries", "🥦 Cruciferous vegetables"],
  },
  ovulation: {
    headline: "Maximum Fuel for Maximum Output",
    reasoning: "Your metabolism is at its fastest. High-quality carbs before training and protein within 30 minutes post-workout. Stay hydrated — your body temperature runs slightly higher.",
    suggestedFoods: ["🍌 Banana before training", "🍗 Lean protein", "🍚 Brown rice or quinoa", "🥑 Avocado for fats", "💧 Extra hydration"],
  },
  luteal: {
    headline: "Satiety + Craving Control",
    reasoning: "Progesterone raises your metabolic rate — you genuinely need more fuel. Magnesium-rich foods combat cravings directly. Complex carbs every 3–4 hours stabilise blood sugar and prevent mood crashes.",
    suggestedFoods: ["🥑 Avocado", "🌰 Almonds and walnuts", "🍫 Dark chocolate (70%+)", "🍠 Sweet potato", "🎃 Pumpkin seeds"],
  },
};

/** Craving-aware food suggestions overlaid on phase base */
const CRAVING_OVERLAYS: Record<string, string[]> = {
  sweet:   ["🍫 Dark chocolate", "🍌 Banana", "🌾 Oats with cinnamon"],
  salty:   ["🫒 Olives", "🥑 Avocado", "🌿 Celery with nut butter"],
  fatty:   ["🐟 Salmon", "🌰 Walnuts", "🥚 Eggs", "🫙 Olive oil"],
  protein: ["🍗 Chicken breast", "🥚 Eggs", "🫘 Lentils or beans"],
  carbs:   ["🍠 Sweet potato", "🌾 Oats", "🍚 Brown rice"],
  dairy:   ["🫙 Greek yogurt", "🥛 Kefir", "🧀 Feta"],
  sour:    ["🍋 Lemon water", "🫙 Sauerkraut", "🥝 Kiwi"],
};

function getMealFocus(
  phase: Phase,
  readinessScore: number,
  cravings?: string[]
): MealFocus {
  const base = MEAL_BASE[phase];

  // Macro adjustment based on readiness — high output days need more fuel
  let macroAdjustment: string | undefined;
  if (readinessScore >= 80) {
    macroAdjustment = "High output day — consider +150–200 kcal, focus on carbs pre-workout and protein post-workout.";
  } else if (readinessScore < 40) {
    macroAdjustment = "Rest day — eat to satisfaction, no need to force intake. Focus on nutrient density.";
  }

  // Build suggested foods — start from phase base, overlay cravings
  let suggestedFoods = [...base.suggestedFoods];
  if (cravings && cravings.length > 0) {
    const cravingKey = cravings[0].toLowerCase(); // use primary craving
    const overlay = CRAVING_OVERLAYS[cravingKey];
    if (overlay) {
      // Prepend craving-specific foods, avoid duplicates
      const extras = overlay.filter(f => !suggestedFoods.includes(f));
      suggestedFoods = [...extras.slice(0, 2), ...suggestedFoods.slice(0, 4)];
    }
  }

  return {
    headline: base.headline,
    reasoning: base.reasoning,
    macroAdjustment,
    suggestedFoods,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INSIGHT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

interface InsightRule {
  generic: { title: string; body: string };
  adapted: { title: string; body: string }; // used when adaptedFromCheckin = true
}

const PHASE_INSIGHTS: Record<Phase, InsightRule> = {
  menstrual: {
    generic: {
      title: "Your rest window is scientifically valid",
      body: "Oestrogen and progesterone are at their lowest. Your body is doing significant internal work — the uterine lining is shedding and prostaglandins are active. Rest and gentle movement aren't laziness. They're periodisation.",
    },
    adapted: {
      title: "Your body is communicating clearly today",
      body: "Your check-in reflects what the hormonal environment predicts — lower energy and mood are normal and expected during menstruation. Honouring these signals reduces injury risk and supports recovery for the stronger phases ahead.",
    },
  },
  follicular: {
    generic: {
      title: "This is your strength-building window",
      body: "Rising oestrogen increases muscle protein synthesis, improves insulin sensitivity, and sharpens mental clarity. Your brain is more receptive to new motor patterns. Schedule your hardest training sessions and most demanding work this week.",
    },
    adapted: {
      title: "Your energy is reflecting the hormonal climb",
      body: "Follicular phase oestrogen is rising — and your check-in shows it. This is the window where training adaptations happen fastest. Progressive overload now pays dividends through the rest of your cycle.",
    },
  },
  ovulation: {
    generic: {
      title: "Your physiological peak — don't waste it",
      body: "Peak oestrogen combines with a brief testosterone surge to give you rare strength AND endurance overlap. This window lasts 2–3 days. Personal records attempted now have the highest success rate of any phase.",
    },
    adapted: {
      title: "Your readiness confirms peak phase potential",
      body: "Your check-in aligns with what ovulation delivers hormonally. This is the day to attempt what you've been building toward. High effort today has faster recovery and better adaptation than the same effort in any other phase.",
    },
  },
  luteal: {
    generic: {
      title: "Consistency beats intensity right now",
      body: "Progesterone is dominant — your core temperature is elevated, recovery is slower, and mood can be more volatile. The goal in luteal isn't peak performance. It's maintaining the base you built in follicular and ovulation.",
    },
    adapted: {
      title: "Your check-in is helping you train smarter",
      body: "Luteal phase is the most variable — some days feel strong, others don't. Your check-in is your most accurate readiness signal right now. Trust it over the calendar.",
    },
  },
};

function getInsight(
  phase: Phase,
  adaptedFromCheckin: boolean,
  dataMaturity: DataMaturityStage
): { title: string; body: string } {
  const rule = PHASE_INSIGHTS[phase];

  if (dataMaturity === "generic" || !adaptedFromCheckin) {
    return rule.generic;
  }
  return rule.adapted;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA MATURITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines data maturity stage from total mood log count.
 * generic:       < 7 logs  (less than one week of data)
 * early:         7–27 logs (a few weeks, patterns emerging)
 * personalized:  >= 28 logs (approximately one full cycle)
 */
export function getDataMaturityStage(logCount?: number): DataMaturityStage {
  if (!logCount || logCount < 7)  return "generic";
  if (logCount < 28)              return "early";
  return "personalized";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateTodayState — the central engine of HerPhase.
 *
 * Takes a DailyPlanInput and returns a fully computed TodayState object.
 * This function is pure — no DB calls, no side effects.
 * Call it from AppContext after loading profile + latest check-in.
 *
 * @example
 * const todayState = generateTodayState({
 *   phase: "ovulation",
 *   cycleDay: 14,
 *   checkin: { mood: 4, energy: 5, symptoms: [], sleep_hours: 8 },
 *   logCount: 32,
 * });
 */
export function generateTodayState(input: DailyPlanInput): TodayState {
  const {
    phase,
    cycleDay,
    checkin,
    userGoals,
    recentWorkoutCount,
    logCount,
  } = input;

  // 1. Determine data maturity
  const dataMaturityStage = getDataMaturityStage(logCount);

  // 2. Calculate readiness
  const readinessScore = calcReadinessScore(phase, checkin ?? null);
  const readinessLabel = getReadinessLabel(readinessScore);
  const adaptedFromCheckin = checkin != null;

  // 3. Workout recommendation
  const workoutRecommendation = getWorkoutRecommendation(phase, readinessLabel);

  // 4. Meal focus (craving-aware if check-in has cravings)
  const mealFocus = getMealFocus(phase, readinessScore, checkin?.cravings);

  // 5. Insight
  const { title: insightTitle, body: insightBody } = getInsight(
    phase,
    adaptedFromCheckin,
    dataMaturityStage
  );

  return {
    readinessScore,
    readinessLabel,
    workoutRecommendation,
    mealFocus,
    insightTitle,
    insightBody,
    dataMaturityStage,
    adaptedFromCheckin,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY EXPORTS
// (re-exported for convenience — consumers can import from dailyPlan directly)
// ─────────────────────────────────────────────────────────────────────────────

export { calcReadinessScore as computeReadiness };
