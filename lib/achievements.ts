export interface AchievementDef {
  id: string;
  icon: string;
  label: string;
  description: string;
  unlocked: boolean;
  progress?: string;
}

export interface AchievementCounts {
  workouts: number;
  meals: number;
  prs: number;
  weightLogs: number;
  uniqueExercises: number;
  streak: number;
}

const BADGES: Array<{
  id: string;
  icon: string;
  label: string;
  description: string;
  check: (c: AchievementCounts) => boolean;
  progressFn: (c: AchievementCounts) => string | undefined;
}> = [
  {
    id: "first_pr",
    icon: "🏋️",
    label: "First PR",
    description: "Log your first personal record",
    check: (c) => c.prs >= 1,
    progressFn: (c) => c.prs === 0 ? "Log a PR to unlock" : undefined,
  },
  {
    id: "streak_7",
    icon: "🔥",
    label: "7-day streak",
    description: "Check in 7 days in a row",
    check: (c) => c.streak >= 7,
    progressFn: (c) => c.streak < 7 ? `${c.streak} / 7 days` : undefined,
  },
  {
    id: "streak_30",
    icon: "🌟",
    label: "30-day streak",
    description: "Check in 30 days in a row",
    check: (c) => c.streak >= 30,
    progressFn: (c) => c.streak < 30 ? `${c.streak} / 30 days` : undefined,
  },
  {
    id: "workouts_10",
    icon: "💪",
    label: "10 workouts",
    description: "Complete 10 training sessions",
    check: (c) => c.workouts >= 10,
    progressFn: (c) => c.workouts < 10 ? `${c.workouts} / 10 workouts` : undefined,
  },
  {
    id: "meals_50",
    icon: "🥗",
    label: "50 meals logged",
    description: "Log 50 meals",
    check: (c) => c.meals >= 50,
    progressFn: (c) => c.meals < 50 ? `${c.meals} / 50 meals` : undefined,
  },
  {
    id: "first_weight",
    icon: "⚖️",
    label: "Weighed in",
    description: "Log your first weight entry",
    check: (c) => c.weightLogs >= 1,
    progressFn: (c) => c.weightLogs === 0 ? "Log a weight to unlock" : undefined,
  },
  {
    id: "variety_5",
    icon: "🎯",
    label: "Mix it up",
    description: "Hit a PR in 5 different exercises",
    check: (c) => c.uniqueExercises >= 5,
    progressFn: (c) => c.uniqueExercises < 5 ? `${c.uniqueExercises} / 5 exercises` : undefined,
  },
];

export function computeAchievements(counts: AchievementCounts): AchievementDef[] {
  return BADGES.map((b) => ({
    id: b.id,
    icon: b.icon,
    label: b.label,
    description: b.description,
    unlocked: b.check(counts),
    progress: b.check(counts) ? undefined : b.progressFn(counts),
  }));
}
