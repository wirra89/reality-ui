// lib/trainingEngine.ts
// Pure workout-type scoring engine for HerPhase training intelligence.
// No Supabase imports — all DB interaction lives in lib/trainingQueries.ts.
// Mirrors lib/recipeEngine.ts architecture for consistency.

import type { Phase } from "@/types/recipe";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WorkoutTypeId =
  | "strength_lower"
  | "strength_upper"
  | "strength_full"
  | "hypertrophy_lower"
  | "hypertrophy_upper"
  | "hiit_cardio"
  | "circuit_full"
  | "cardio_moderate"
  | "mobility_recovery"
  | "bodyweight_light"
  | "glute_focused"
  | "core_stability";

export type EquipmentLevel = "none" | "minimal" | "gym";
export type WorkoutIntensity = "recovery" | "light" | "moderate" | "high" | "peak";

export interface WorkoutTypeDef {
  id: WorkoutTypeId;
  name: string;
  phases: Phase[];
  intensities: WorkoutIntensity[];
  durationMin: number;
  equipmentRequired: EquipmentLevel;
  description: string;
}

export interface TrainingEngineInput {
  phase: Phase;
  cycleDay: number;
  readinessScore: number;
  readinessLabel: "rest" | "moderate" | "good" | "peak";
  symptoms: string[];
  goal: string | null;
  energy: number | null;
  equipmentLevel: EquipmentLevel;
  availableMinutes: number;
  recentWorkoutTypes: WorkoutTypeId[];
}

export interface ScoredWorkoutType {
  workoutTypeId: WorkoutTypeId;
  score: number;
  matchReasons: string[];
  estimatedDuration: number;
  intensity: WorkoutIntensity;
}

export interface TrainingRecommendation {
  primary: ScoredWorkoutType;
  fallback: ScoredWorkoutType;
  allScored: ScoredWorkoutType[];
}

// ── Workout type catalogue ────────────────────────────────────────────────────

export const WORKOUT_TYPES: Record<WorkoutTypeId, WorkoutTypeDef> = {
  strength_lower: {
    id: "strength_lower",
    name: "Lower Body Strength",
    phases: ["follicular", "ovulation", "luteal"],  // early luteal still supports strength
    intensities: ["high", "peak"],
    durationMin: 50,
    equipmentRequired: "gym",
    description: "Heavy compound lower body: squats, deadlifts, lunges",
  },
  strength_upper: {
    id: "strength_upper",
    name: "Upper Body Strength",
    phases: ["follicular", "ovulation", "luteal"],
    intensities: ["high", "peak"],
    durationMin: 50,
    equipmentRequired: "gym",
    description: "Heavy compound upper body: bench, rows, overhead press",
  },
  strength_full: {
    id: "strength_full",
    name: "Full Body Strength",
    phases: ["follicular", "ovulation"],
    intensities: ["high", "peak"],
    durationMin: 60,
    equipmentRequired: "gym",
    description: "Full body compound movements with heavy loading",
  },
  hypertrophy_lower: {
    id: "hypertrophy_lower",
    name: "Lower Hypertrophy",
    phases: ["follicular", "ovulation", "luteal"],
    intensities: ["moderate", "high"],
    durationMin: 55,
    equipmentRequired: "gym",
    description: "Moderate weight, higher reps for lower body muscle growth",
  },
  hypertrophy_upper: {
    id: "hypertrophy_upper",
    name: "Upper Hypertrophy",
    phases: ["follicular", "ovulation", "luteal"],
    intensities: ["moderate", "high"],
    durationMin: 55,
    equipmentRequired: "gym",
    description: "Moderate weight, higher reps for upper body muscle growth",
  },
  hiit_cardio: {
    id: "hiit_cardio",
    name: "HIIT Cardio",
    phases: ["follicular", "ovulation", "luteal"],  // viable in early luteal
    intensities: ["high", "peak"],
    durationMin: 30,
    equipmentRequired: "minimal",
    description: "High-intensity intervals for max calorie burn and cardiovascular fitness",
  },
  circuit_full: {
    id: "circuit_full",
    name: "Full Body Circuit",
    phases: ["follicular", "ovulation", "luteal", "menstrual"],
    intensities: ["moderate", "high"],
    durationMin: 40,
    equipmentRequired: "minimal",
    description: "Timed circuits combining strength and cardio movements",
  },
  cardio_moderate: {
    id: "cardio_moderate",
    name: "Moderate Cardio",
    phases: ["follicular", "ovulation", "luteal", "menstrual"],
    intensities: ["light", "moderate"],
    durationMin: 35,
    equipmentRequired: "none",
    description: "Steady-state cardio at a comfortable, sustainable pace",
  },
  mobility_recovery: {
    id: "mobility_recovery",
    name: "Mobility & Recovery",
    phases: ["menstrual", "luteal", "follicular", "ovulation"],
    intensities: ["recovery", "light"],
    durationMin: 30,
    equipmentRequired: "none",
    description: "Stretching, foam rolling, yoga flows and joint mobility work",
  },
  bodyweight_light: {
    id: "bodyweight_light",
    name: "Light Bodyweight",
    phases: ["menstrual", "luteal", "follicular"],  // good active recovery in follicular
    intensities: ["light", "moderate"],
    durationMin: 30,
    equipmentRequired: "none",
    description: "Gentle bodyweight movements focusing on technique and activation",
  },
  glute_focused: {
    id: "glute_focused",
    name: "Glute Focus",
    phases: ["luteal", "follicular", "menstrual"],  // gentle activation fine on period
    intensities: ["light", "moderate", "high"],
    durationMin: 45,
    equipmentRequired: "minimal",
    description: "Hip thrusts, glute bridges, kickbacks and isolation work",
  },
  core_stability: {
    id: "core_stability",
    name: "Core & Stability",
    phases: ["menstrual", "luteal", "follicular", "ovulation"],
    intensities: ["light", "moderate"],
    durationMin: 25,
    equipmentRequired: "none",
    description: "Planks, dead bugs, pallof press and anti-rotation work",
  },
};

// ── Signal maps ───────────────────────────────────────────────────────────────

const SYMPTOM_ADJUSTMENTS: Record<string, Partial<Record<WorkoutTypeId, number>>> = {
  cramps:    { mobility_recovery: 15, bodyweight_light: 10, core_stability: 5, hiit_cardio: -15, strength_full: -10 },
  fatigue:   { mobility_recovery: 12, bodyweight_light: 8, cardio_moderate: 5, strength_full: -12, hiit_cardio: -12 },
  bloating:  { mobility_recovery: 10, core_stability: 8, hiit_cardio: -15, circuit_full: -8 },
  low_mood:  { cardio_moderate: 10, hiit_cardio: 8, bodyweight_light: 6 },
  headache:  { mobility_recovery: 15, bodyweight_light: 10, strength_full: -15, hiit_cardio: -15 },
};

const GOAL_TYPE_MAP: Record<string, WorkoutTypeId[]> = {
  fat_loss:     ["hiit_cardio", "circuit_full", "cardio_moderate"],
  recomp:       ["strength_lower", "strength_upper", "circuit_full"],
  muscle_gain:  ["strength_lower", "strength_upper", "strength_full", "hypertrophy_lower", "hypertrophy_upper"],
  maintenance:  ["circuit_full", "cardio_moderate", "bodyweight_light"],
  recovery:     ["mobility_recovery", "bodyweight_light", "core_stability"],
};

// ── Scoring helpers ───────────────────────────────────────────────────────────

function getReadinessIntensity(label: TrainingEngineInput["readinessLabel"]): WorkoutIntensity {
  switch (label) {
    case "rest":     return "recovery";
    case "moderate": return "light";
    case "good":     return "moderate";
    case "peak":     return "high";
  }
}

function countRepeatPenalty(typeId: WorkoutTypeId, recent: WorkoutTypeId[]): number {
  // 18 pts per repeat — enough to rotate away from yesterday's winner
  return recent.filter(t => t === typeId).length * 18;
}

// ── Core scoring ──────────────────────────────────────────────────────────────

function scoreOne(typeId: WorkoutTypeId, def: WorkoutTypeDef, input: TrainingEngineInput): ScoredWorkoutType {
  let score = 0;
  const matchReasons: string[] = [];
  const targetIntensity = getReadinessIntensity(input.readinessLabel);

  // Phase compatibility — +25 base if phase is listed
  if (def.phases.includes(input.phase)) {
    score += 25;
    const phaseBonus = Math.round((input.readinessScore / 100) * 25);
    score += phaseBonus;
    matchReasons.push(`Great for your ${input.phase} phase`);
  }

  // Readiness / intensity match — +20
  if (def.intensities.includes(targetIntensity)) {
    score += 20;
    matchReasons.push(`Matches your readiness today`);
  } else {
    const order: WorkoutIntensity[] = ["recovery", "light", "moderate", "high", "peak"];
    const defMax = Math.max(...def.intensities.map(i => order.indexOf(i)));
    const targetIdx = order.indexOf(targetIntensity);
    if (Math.abs(defMax - targetIdx) === 1) score += 8;
  }

  // Equipment availability
  const equipOrder: EquipmentLevel[] = ["none", "minimal", "gym"];
  if (equipOrder.indexOf(def.equipmentRequired) > equipOrder.indexOf(input.equipmentLevel)) {
    score -= 50;
  }

  // Time fit — +5
  if (def.durationMin <= input.availableMinutes) {
    score += 5;
    matchReasons.push(`Fits in ${def.durationMin} min`);
  }

  // Energy match — +10
  if (input.energy !== null) {
    if (input.energy <= 2 && (targetIntensity === "recovery" || targetIntensity === "light")) {
      if (def.intensities.includes(targetIntensity)) {
        score += 10;
        matchReasons.push("Easy on low energy");
      }
    } else if (input.energy >= 4 && (targetIntensity === "high" || targetIntensity === "peak")) {
      if (def.intensities.includes("high") || def.intensities.includes("peak")) {
        score += 10;
        matchReasons.push("Fuels your energy today");
      }
    }
  }

  // Goal match — +14
  if (input.goal) {
    const goalTypes = GOAL_TYPE_MAP[input.goal] ?? [];
    if (goalTypes.includes(typeId)) {
      score += 14;
      matchReasons.push(`Aligned with ${input.goal.replace(/_/g, " ")}`);
    }
  }

  // Symptom adjustments
  for (const symptom of input.symptoms) {
    const adjustments = SYMPTOM_ADJUSTMENTS[symptom] ?? {};
    const delta = adjustments[typeId] ?? 0;
    if (delta !== 0) score += delta;
    if (delta > 0 && !matchReasons.some(r => r.includes("symptom"))) {
      matchReasons.push("Supports your symptoms today");
    }
  }

  // Repetition penalty
  score -= countRepeatPenalty(typeId, input.recentWorkoutTypes);

  // Floor at 0
  score = Math.max(0, score);

  return {
    workoutTypeId: typeId,
    score,
    matchReasons: matchReasons.slice(0, 3),
    estimatedDuration: def.durationMin,
    intensity: def.intensities[def.intensities.length - 1],
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function scoreWorkoutTypes(input: TrainingEngineInput): TrainingRecommendation {
  const allScored = (Object.keys(WORKOUT_TYPES) as WorkoutTypeId[])
    .map(id => scoreOne(id, WORKOUT_TYPES[id], input))
    .sort((a, b) => b.score - a.score);

  // When multiple types score within 10 pts of the leader they are genuinely equally good.
  // Rotate through them by cycleDay so each day surfaces a different option — without
  // needing workout history in the DB.
  const topScore = allScored[0]?.score ?? 0;
  const topCandidates = allScored.filter(s => s.score > 0 && topScore - s.score <= 10);

  const primary = topCandidates.length > 1
    ? topCandidates[input.cycleDay % topCandidates.length]
    : allScored[0];

  const fallback = allScored.find(s => s.workoutTypeId !== primary.workoutTypeId) ?? allScored[1];

  return { primary, fallback, allScored };
}

export function buildTrainingInput(params: {
  phase: Phase;
  cycleDay: number;
  readinessScore: number;
  readinessLabel: TrainingEngineInput["readinessLabel"];
  symptoms?: string[];
  goal?: string | null;
  energy?: number | null;
  equipmentLevel?: EquipmentLevel;
  availableMinutes?: number;
  recentWorkoutTypes?: WorkoutTypeId[];
}): TrainingEngineInput {
  return {
    phase:               params.phase,
    cycleDay:            params.cycleDay,
    readinessScore:      params.readinessScore,
    readinessLabel:      params.readinessLabel,
    symptoms:            params.symptoms ?? [],
    goal:                params.goal ?? null,
    energy:              params.energy ?? null,
    equipmentLevel:      params.equipmentLevel ?? "gym",
    availableMinutes:    params.availableMinutes ?? 60,
    recentWorkoutTypes:  params.recentWorkoutTypes ?? [],
  };
}
