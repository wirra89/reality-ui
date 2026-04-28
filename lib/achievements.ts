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
  moodLogs: number;
  progressPhotos: number;
  allMealTypesDay: boolean;   // logged all 4 meal types in at least one day
}

const BADGES: Array<{
  id: string;
  icon: string;
  label: string;
  description: string;
  check: (c: AchievementCounts) => boolean;
  progressFn: (c: AchievementCounts) => string | undefined;
}> = [

  // ── First-time milestones ─────────────────────────────────────────────────

  {
    id: "first_workout",
    icon: "🏃‍♀️",
    label: "First session",
    description: "Complete your first training session",
    check: (c) => c.workouts >= 1,
    progressFn: (c) => c.workouts === 0 ? "Start a workout to unlock" : undefined,
  },
  {
    id: "first_meal",
    icon: "🍽️",
    label: "First bite",
    description: "Log your first meal",
    check: (c) => c.meals >= 1,
    progressFn: (c) => c.meals === 0 ? "Log a meal to unlock" : undefined,
  },
  {
    id: "first_checkin",
    icon: "💭",
    label: "First check-in",
    description: "Complete your first daily check-in",
    check: (c) => c.moodLogs >= 1,
    progressFn: (c) => c.moodLogs === 0 ? "Do a check-in to unlock" : undefined,
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
    id: "first_pr",
    icon: "🏋️",
    label: "First PR",
    description: "Log your first personal record",
    check: (c) => c.prs >= 1,
    progressFn: (c) => c.prs === 0 ? "Log a PR to unlock" : undefined,
  },
  {
    id: "first_photo",
    icon: "📸",
    label: "First photo",
    description: "Upload your first progress photo",
    check: (c) => c.progressPhotos >= 1,
    progressFn: (c) => c.progressPhotos === 0 ? "Add a photo to unlock" : undefined,
  },

  // ── Streak achievements ───────────────────────────────────────────────────

  {
    id: "streak_3",
    icon: "✨",
    label: "Momentum",
    description: "Check in 3 days in a row",
    check: (c) => c.streak >= 3,
    progressFn: (c) => c.streak < 3 ? `${c.streak} / 3 days` : undefined,
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
    id: "streak_14",
    icon: "🌙",
    label: "Fortnight",
    description: "Check in 14 days in a row",
    check: (c) => c.streak >= 14,
    progressFn: (c) => c.streak < 14 ? `${c.streak} / 14 days` : undefined,
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
    id: "streak_60",
    icon: "🌀",
    label: "Full cycle ×2",
    description: "Check in 60 days in a row — two full cycles",
    check: (c) => c.streak >= 60,
    progressFn: (c) => c.streak < 60 ? `${c.streak} / 60 days` : undefined,
  },

  // ── Fitness achievements ──────────────────────────────────────────────────

  {
    id: "workouts_10",
    icon: "💪",
    label: "10 sessions",
    description: "Complete 10 training sessions",
    check: (c) => c.workouts >= 10,
    progressFn: (c) => c.workouts < 10 ? `${c.workouts} / 10` : undefined,
  },
  {
    id: "workouts_25",
    icon: "🏅",
    label: "25 sessions",
    description: "Complete 25 training sessions",
    check: (c) => c.workouts >= 25,
    progressFn: (c) => c.workouts < 25 ? `${c.workouts} / 25` : undefined,
  },
  {
    id: "workouts_50",
    icon: "🦁",
    label: "50 sessions",
    description: "Complete 50 training sessions",
    check: (c) => c.workouts >= 50,
    progressFn: (c) => c.workouts < 50 ? `${c.workouts} / 50` : undefined,
  },
  {
    id: "workouts_100",
    icon: "🏆",
    label: "Century",
    description: "Complete 100 training sessions",
    check: (c) => c.workouts >= 100,
    progressFn: (c) => c.workouts < 100 ? `${c.workouts} / 100` : undefined,
  },
  {
    id: "prs_5",
    icon: "⚡",
    label: "PR machine",
    description: "Log 5 personal records",
    check: (c) => c.prs >= 5,
    progressFn: (c) => c.prs < 5 ? `${c.prs} / 5 PRs` : undefined,
  },
  {
    id: "prs_10",
    icon: "👑",
    label: "Strength queen",
    description: "Log 10 personal records",
    check: (c) => c.prs >= 10,
    progressFn: (c) => c.prs < 10 ? `${c.prs} / 10 PRs` : undefined,
  },
  {
    id: "prs_20",
    icon: "💥",
    label: "Unstoppable",
    description: "Log 20 personal records",
    check: (c) => c.prs >= 20,
    progressFn: (c) => c.prs < 20 ? `${c.prs} / 20 PRs` : undefined,
  },
  {
    id: "variety_5",
    icon: "🎯",
    label: "Mix it up",
    description: "Hit a PR in 5 different exercises",
    check: (c) => c.uniqueExercises >= 5,
    progressFn: (c) => c.uniqueExercises < 5 ? `${c.uniqueExercises} / 5 exercises` : undefined,
  },
  {
    id: "variety_10",
    icon: "🌈",
    label: "All-rounder",
    description: "Hit a PR in 10 different exercises",
    check: (c) => c.uniqueExercises >= 10,
    progressFn: (c) => c.uniqueExercises < 10 ? `${c.uniqueExercises} / 10 exercises` : undefined,
  },
  {
    id: "variety_15",
    icon: "🎖️",
    label: "Elite lifter",
    description: "Hit a PR in 15 different exercises",
    check: (c) => c.uniqueExercises >= 15,
    progressFn: (c) => c.uniqueExercises < 15 ? `${c.uniqueExercises} / 15 exercises` : undefined,
  },

  // ── Nutrition achievements ────────────────────────────────────────────────

  {
    id: "meals_10",
    icon: "🥗",
    label: "Food diary",
    description: "Log 10 meals",
    check: (c) => c.meals >= 10,
    progressFn: (c) => c.meals < 10 ? `${c.meals} / 10 meals` : undefined,
  },
  {
    id: "meals_50",
    icon: "👩‍🍳",
    label: "50 meals",
    description: "Log 50 meals",
    check: (c) => c.meals >= 50,
    progressFn: (c) => c.meals < 50 ? `${c.meals} / 50 meals` : undefined,
  },
  {
    id: "meals_100",
    icon: "🌿",
    label: "Nutrition pro",
    description: "Log 100 meals",
    check: (c) => c.meals >= 100,
    progressFn: (c) => c.meals < 100 ? `${c.meals} / 100 meals` : undefined,
  },
  {
    id: "all_meal_types",
    icon: "🍱",
    label: "Full day fuelled",
    description: "Log breakfast, lunch, dinner & snack in one day",
    check: (c) => c.allMealTypesDay,
    progressFn: () => "Log all 4 meal types in one day",
  },

  // ── Body tracking ─────────────────────────────────────────────────────────

  {
    id: "weight_7",
    icon: "📊",
    label: "Body tracker",
    description: "Log your weight 7 times",
    check: (c) => c.weightLogs >= 7,
    progressFn: (c) => c.weightLogs < 7 ? `${c.weightLogs} / 7 logs` : undefined,
  },
  {
    id: "weight_30",
    icon: "🔬",
    label: "Data nerd",
    description: "Log your weight 30 times",
    check: (c) => c.weightLogs >= 30,
    progressFn: (c) => c.weightLogs < 30 ? `${c.weightLogs} / 30 logs` : undefined,
  },
  {
    id: "photos_3",
    icon: "🖼️",
    label: "Photo series",
    description: "Upload 3 progress photos",
    check: (c) => c.progressPhotos >= 3,
    progressFn: (c) => c.progressPhotos < 3 ? `${c.progressPhotos} / 3 photos` : undefined,
  },

  // ── Check-in consistency ──────────────────────────────────────────────────

  {
    id: "checkins_10",
    icon: "🧘‍♀️",
    label: "10 check-ins",
    description: "Complete 10 daily check-ins",
    check: (c) => c.moodLogs >= 10,
    progressFn: (c) => c.moodLogs < 10 ? `${c.moodLogs} / 10` : undefined,
  },
  {
    id: "checkins_30",
    icon: "📅",
    label: "30 check-ins",
    description: "Complete 30 daily check-ins",
    check: (c) => c.moodLogs >= 30,
    progressFn: (c) => c.moodLogs < 30 ? `${c.moodLogs} / 30` : undefined,
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
