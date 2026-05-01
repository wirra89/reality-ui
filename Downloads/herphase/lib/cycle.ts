// lib/cycle.ts
// Core cycle phase detection and recommendation engine

export type Phase = "menstrual" | "follicular" | "ovulation" | "luteal";

export interface PhaseData {
  phase: Phase;
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  badgeClass: string;
  training: string;
  trainingDetail: string;
  nutrition: string;
  nutritionDetail: string;
  aiRecommendation: string;
  readinessScore: number; // 0–100
  energyLevel: "low" | "moderate" | "high" | "peak";
  macros: {
    carbs: number;   // grams (approximate daily)
    protein: number;
    fats: number;
  };
}

// Compute phase boundaries dynamically from user's cycle settings
export interface CycleParams {
  cycleLength?: number;
  periodLength?: number;
  ovulationLength?: number;
}

export function getPhaseBoundaries(params: CycleParams = {}) {
  const cycleLength      = params.cycleLength      ?? 28;
  const periodLength     = params.periodLength     ?? 5;
  const ovulationLength  = params.ovulationLength  ?? 3;

  const menstrualEnd  = periodLength;
  const ovulationMid  = Math.round(cycleLength * 0.5);
  const ovulationStart = ovulationMid - Math.floor(ovulationLength / 2);
  const ovulationEnd  = ovulationStart + ovulationLength - 1;
  const follicularEnd = ovulationStart - 1;

  return {
    menstrual:  { start: 1,              end: menstrualEnd },
    follicular: { start: menstrualEnd + 1, end: follicularEnd },
    ovulation:  { start: ovulationStart, end: ovulationEnd },
    luteal:     { start: ovulationEnd + 1, end: cycleLength },
  };
}

export function getPhase(day: number, params: CycleParams = {}): Phase {
  const b = getPhaseBoundaries(params);
  if (day >= b.menstrual.start  && day <= b.menstrual.end)  return "menstrual";
  if (day >= b.follicular.start && day <= b.follicular.end) return "follicular";
  if (day >= b.ovulation.start  && day <= b.ovulation.end)  return "ovulation";
  return "luteal";
}

export function getPhaseData(day: number, params: CycleParams = {}): PhaseData {
  const phase = getPhase(day, params);

  const phaseMap: Record<Phase, PhaseData> = {
    menstrual: {
      phase: "menstrual",
      label: "Low energy",
      emoji: "🌙",
      colorClass: "text-rose-400",
      bgClass: "bg-rose-50",
      badgeClass: "bg-rose-100 text-rose-600",
      training: "Light / Recovery",
      trainingDetail:
        "Focus on gentle movement — walking, yin yoga, or light stretching. Your body is doing important work; honour it with recovery.",
      nutrition: "Iron + Healthy Fats",
      nutritionDetail:
        "Replenish lost iron with leafy greens, lentils, and red meat. Omega-3s from salmon or walnuts reduce cramping and inflammation.",
      aiRecommendation:
        "This is your rest window. Your oestrogen and progesterone are at their lowest — pushing hard now increases injury risk and fatigue. Prioritise sleep, warm nourishing meals, and gentle walks. A 20-min restorative yoga session is your best workout today.",
      readinessScore: 38,
      energyLevel: "low",
      macros: { carbs: 160, protein: 110, fats: 65 },
    },
    follicular: {
      phase: "follicular",
      label: "Build phase",
      emoji: "🌱",
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-50",
      badgeClass: "bg-emerald-100 text-emerald-700",
      training: "Strength / Progressive Overload",
      trainingDetail:
        "Rising oestrogen means faster muscle repair and higher pain tolerance. This is the ideal window to add weight, try new movements, and push volume.",
      nutrition: "Higher Carbs + Lean Protein",
      nutritionDetail:
        "Fuel muscle-building with complex carbs — oats, rice, sweet potato. Pair with lean protein (chicken, eggs, tofu) to maximise synthesis.",
      aiRecommendation:
        "Your oestrogen is climbing — strength gains come more easily now. Schedule your heaviest compound lifts (squats, deadlifts, bench) this week. Carb-load before sessions for sustained energy. Recovery is faster than usual, so you can afford slightly higher training frequency.",
      readinessScore: 74,
      energyLevel: "moderate",
      macros: { carbs: 210, protein: 140, fats: 55 },
    },
    ovulation: {
      phase: "ovulation",
      label: "Peak performance",
      emoji: "⚡",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-50",
      badgeClass: "bg-amber-100 text-amber-700",
      training: "Heavy Lifts / PRs / HIIT",
      trainingDetail:
        "Peak oestrogen + LH surge = your physiological prime. Attempt personal records, high-intensity intervals, and challenging skill work today.",
      nutrition: "High Carbs + High Protein",
      nutritionDetail:
        "Maximum fuel for maximum output. Carbs before training and protein within 30 min post-workout. Stay well-hydrated — your temperature runs slightly higher.",
      aiRecommendation:
        "This is your superpower window. Testosterone briefly spikes alongside oestrogen, giving you rare strength + endurance overlap. Book your PRs and HIIT sessions NOW. Studies show women are up to 10% stronger during ovulation. Eat big, train hard, sleep 8hrs.",
      readinessScore: 95,
      energyLevel: "peak",
      macros: { carbs: 240, protein: 155, fats: 50 },
    },
    luteal: {
      phase: "luteal",
      label: "Stabilize & recover",
      emoji: "🍂",
      colorClass: "text-violet-400",
      bgClass: "bg-violet-50",
      badgeClass: "bg-violet-100 text-violet-600",
      training: "Moderate Intensity",
      trainingDetail:
        "Progesterone rises — your core temperature is higher and recovery slows. Moderate lifting, Pilates, and zone 2 cardio keep you consistent without overloading.",
      nutrition: "More Fats + Stable Carbs",
      nutritionDetail:
        "Cravings are real and hormonal — satisfy them smartly with avocado, nuts, and dark chocolate. Keep blood sugar stable with complex carbs to prevent energy crashes.",
      aiRecommendation:
        "Progesterone is dominant and your body temperature is elevated — this is not the time to chase PRs. Maintain consistency with moderate sessions. If you feel PMS symptoms, magnesium-rich foods (dark chocolate, almonds) can genuinely help. Prioritise sleep quality and stress management this week.",
      readinessScore: 58,
      energyLevel: "moderate",
      macros: { carbs: 185, protein: 125, fats: 70 },
    },
  };

  return phaseMap[phase];
}

// Parse a YYYY-MM-DD string as local midnight (avoids UTC-offset day shift).
// new Date("YYYY-MM-DD") treats the string as UTC, which in UTC+N timezones
// resolves to the previous calendar day. Using the numeric constructor instead
// gives local midnight with no offset.
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Calculate current cycle day from period start date
export function calcCycleDayFromDate(periodStartDate: string, cycleLength = 28): number {
  const start = parseLocalDate(periodStartDate);
  const today = new Date();

  // Reset to midnight for accurate day diff
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1; // future date — default to day 1

  // Wrap around cycle length
  const cycleDay = (diffDays % cycleLength) + 1;
  return Math.min(cycleDay, cycleLength);
}

export function formatPeriodStartDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function getDayInPhase(day: number, params: CycleParams = {}): number {
  const phase = getPhase(day, params);
  const b = getPhaseBoundaries(params);
  return day - b[phase].start + 1;
}

export function getPhaseDuration(phase: Phase, params: CycleParams = {}): number {
  const b = getPhaseBoundaries(params);
  return b[phase].end - b[phase].start + 1;
}

// Predict next period and days until
export function getNextPeriodInfo(periodStartDate: string, cycleLength = 28): {
  nextPeriodDate: Date;
  daysUntil: number;
  isOverdue: boolean;
} {
  const start = parseLocalDate(periodStartDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentCycleDay = (diffDays % cycleLength) + 1;
  const daysLeftInCycle = cycleLength - currentCycleDay;

  const nextPeriodDate = new Date(today);
  nextPeriodDate.setDate(today.getDate() + daysLeftInCycle + 1);

  const daysUntil = daysLeftInCycle + 1;
  const isOverdue = daysUntil <= 0;

  return { nextPeriodDate, daysUntil: Math.max(0, daysUntil), isOverdue };
}
