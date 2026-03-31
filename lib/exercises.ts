// lib/exercises.ts
// Complete exercise library with cycle phase recommendations

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "glutes"
  | "legs"
  | "core"
  | "cardio";

export type PhaseTag = "menstrual" | "follicular" | "ovulation" | "luteal" | "all";

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: "barbell" | "dumbbell" | "machine" | "bodyweight" | "cable" | "cardio" | "other";
  difficulty: "beginner" | "intermediate" | "advanced";
  phases: PhaseTag[]; // which phases this exercise is recommended for
  tips: string;       // short coaching tip
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest:     "Chest / Prsa",
  back:      "Back / Leđa",
  shoulders: "Shoulders / Ramena",
  arms:      "Arms / Ruke",
  glutes:    "Glutes / Stražnjica",
  legs:      "Legs / Noge",
  core:      "Core / Trbuh",
  cardio:    "Cardio / Kondicija",
};

export const MUSCLE_EMOJIS: Record<MuscleGroup, string> = {
  chest:     "💪",
  back:      "🔙",
  shoulders: "🏔️",
  arms:      "💪",
  glutes:    "🍑",
  legs:      "🦵",
  core:      "🎯",
  cardio:    "🏃‍♀️",
};

export const DIFFICULTY_COLORS = {
  beginner:     { bg: "#D1FAE5", text: "#065F46" },
  intermediate: { bg: "#FEF3C7", text: "#92400E" },
  advanced:     { bg: "#FCE7F3", text: "#9D174D" },
};

export const EXERCISES: Exercise[] = [
  // ── CHEST ─────────────────────────────────────────────────────────────
  {
    id: "chest-01", name: "Barbell Bench Press", muscle: "chest",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Keep shoulder blades retracted and drive feet into floor for max stability.",
  },
  {
    id: "chest-02", name: "Incline Dumbbell Press", muscle: "chest",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation", "luteal"],
    tips: "Set bench to 30–45°. Control the descent for 2–3 seconds.",
  },
  {
    id: "chest-03", name: "Cable Chest Fly", muscle: "chest",
    equipment: "cable", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Focus on the squeeze at the centre — think hugging a tree.",
  },
  {
    id: "chest-04", name: "Push-Up", muscle: "chest",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "Keep core tight and body in a straight line. Elbows at 45°.",
  },
  {
    id: "chest-05", name: "Dumbbell Chest Fly", muscle: "chest",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["follicular", "luteal"],
    tips: "Slight bend in elbows throughout. Lower until you feel a good stretch.",
  },
  {
    id: "chest-06", name: "Decline Bench Press", muscle: "chest",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["ovulation", "follicular"],
    tips: "Targets lower chest. Keep feet secured on the pad.",
  },
  {
    id: "chest-07", name: "Chest Dip", muscle: "chest",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lean forward slightly to target chest over triceps.",
  },
  {
    id: "chest-08", name: "Machine Chest Press", muscle: "chest",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Great for beginners or fatigue days. Control both directions.",
  },
  {
    id: "chest-09", name: "Landmine Press", muscle: "chest",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Unilateral option — great for shoulder-friendly pressing.",
  },
  {
    id: "chest-10", name: "Close-Grip Push-Up", muscle: "chest",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "Hands shoulder-width. Also hits triceps heavily.",
  },

  // ── BACK ──────────────────────────────────────────────────────────────
  {
    id: "back-01", name: "Barbell Deadlift", muscle: "back",
    equipment: "barbell", difficulty: "advanced",
    phases: ["ovulation", "follicular"],
    tips: "Hinge at hips, keep bar close to body. Big breath before you pull.",
  },
  {
    id: "back-02", name: "Pull-Up", muscle: "back",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Full dead hang at bottom, chin over bar at top. Squeeze lats.",
  },
  {
    id: "back-03", name: "Lat Pulldown", muscle: "back",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Pull to upper chest, lean back slightly. Don't use momentum.",
  },
  {
    id: "back-04", name: "Seated Cable Row", muscle: "back",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Drive elbows back, squeeze shoulder blades at the end.",
  },
  {
    id: "back-05", name: "Barbell Bent-Over Row", muscle: "back",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Hinge to ~45°, pull to lower chest. Keep back neutral.",
  },
  {
    id: "back-06", name: "Dumbbell Single-Arm Row", muscle: "back",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Brace core on bench. Pull elbow to ceiling, not behind you.",
  },
  {
    id: "back-07", name: "T-Bar Row", muscle: "back",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Chest-supported version is easier on the lower back.",
  },
  {
    id: "back-08", name: "Face Pull", muscle: "back",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Pull to eye level, elbows high. Great for rear delts + posture.",
  },
  {
    id: "back-09", name: "Romanian Deadlift", muscle: "back",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Hinge until you feel hamstring stretch. Bar stays on legs.",
  },
  {
    id: "back-10", name: "Inverted Row", muscle: "back",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "Easier than pull-ups. Keep body straight, pull chest to bar.",
  },
  {
    id: "back-11", name: "Hyperextension", muscle: "back",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Don't hyperextend at top. Great for lower back and glutes.",
  },

  // ── SHOULDERS ─────────────────────────────────────────────────────────
  {
    id: "sho-01", name: "Overhead Press (Barbell)", muscle: "shoulders",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["ovulation", "follicular"],
    tips: "Press in a slight arc, squeeze glutes at the top for stability.",
  },
  {
    id: "sho-02", name: "Dumbbell Shoulder Press", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["follicular", "ovulation", "luteal"],
    tips: "Seated or standing. Stop just before full lock-out to keep tension.",
  },
  {
    id: "sho-03", name: "Lateral Raise", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Slight forward tilt, lead with elbows. Don't shrug.",
  },
  {
    id: "sho-04", name: "Cable Lateral Raise", muscle: "shoulders",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Cable keeps constant tension vs dumbbells. Slow and controlled.",
  },
  {
    id: "sho-05", name: "Arnold Press", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Rotate palms as you press. Full range of motion hits all three heads.",
  },
  {
    id: "sho-06", name: "Rear Delt Fly", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Hinge forward. Lead with elbows, control down. Posture gold.",
  },
  {
    id: "sho-07", name: "Upright Row", muscle: "shoulders",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Wide grip reduces shoulder impingement risk. Pull to collar bone.",
  },
  {
    id: "sho-08", name: "Pike Push-Up", muscle: "shoulders",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "Hips high, lower head to floor. Progression towards handstand push-up.",
  },
  {
    id: "sho-09", name: "Band Pull-Apart", muscle: "shoulders",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "all"],
    tips: "Keep arms straight, squeeze shoulder blades. Great warm-up.",
  },
  {
    id: "sho-10", name: "Machine Shoulder Press", muscle: "shoulders",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Safer for wrists and joints. Good for high-rep burnouts.",
  },

  // ── ARMS ──────────────────────────────────────────────────────────────
  {
    id: "arms-01", name: "Barbell Curl", muscle: "arms",
    equipment: "barbell", difficulty: "beginner",
    phases: ["follicular", "ovulation"],
    tips: "Keep elbows glued to sides. Supinate (rotate) at the top.",
  },
  {
    id: "arms-02", name: "Dumbbell Hammer Curl", muscle: "arms",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Neutral grip targets brachialis. Great for arm thickness.",
  },
  {
    id: "arms-03", name: "Incline Dumbbell Curl", muscle: "arms",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Long head stretch at bottom = peak contraction at top.",
  },
  {
    id: "arms-04", name: "Cable Curl", muscle: "arms",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Constant tension through full range. Try rope attachment.",
  },
  {
    id: "arms-05", name: "Tricep Pushdown", muscle: "arms",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Elbows fixed at sides. Squeeze tricep at full extension.",
  },
  {
    id: "arms-06", name: "Skull Crusher", muscle: "arms",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lower to forehead, flare elbows slightly. Great mass builder.",
  },
  {
    id: "arms-07", name: "Overhead Tricep Extension", muscle: "arms",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Long head stretch when arms are overhead. Keep elbows in.",
  },
  {
    id: "arms-08", name: "Preacher Curl", muscle: "arms",
    equipment: "machine", difficulty: "beginner",
    phases: ["luteal", "follicular"],
    tips: "Isolates bicep. Don't fully extend — keep slight bend at bottom.",
  },
  {
    id: "arms-09", name: "Tricep Dip (Bench)", muscle: "arms",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "Keep hips close to bench. Feet further = harder.",
  },
  {
    id: "arms-10", name: "Concentration Curl", muscle: "arms",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["luteal", "menstrual"],
    tips: "Elbow on inner thigh. Full focus on mind-muscle connection.",
  },

  // ── GLUTES ────────────────────────────────────────────────────────────
  {
    id: "glu-01", name: "Barbell Hip Thrust", muscle: "glutes",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Drive through heels, squeeze glutes hard at the top. Chin to chest.",
  },
  {
    id: "glu-02", name: "Romanian Deadlift", muscle: "glutes",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Feel the hamstring/glute stretch on the way down.",
  },
  {
    id: "glu-03", name: "Bulgarian Split Squat", muscle: "glutes",
    equipment: "dumbbell", difficulty: "advanced",
    phases: ["ovulation", "follicular"],
    tips: "Rear foot on bench. Front shin vertical. Brutal but effective.",
  },
  {
    id: "glu-04", name: "Cable Kickback", muscle: "glutes",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Keep slight bend in knee. Squeeze glute at full extension.",
  },
  {
    id: "glu-05", name: "Sumo Squat", muscle: "glutes",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Wide stance, toes out. Targets inner thigh + glutes.",
  },
  {
    id: "glu-06", name: "Glute Bridge", muscle: "glutes",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal", "all"],
    tips: "Great for all phases. Add resistance band for more activation.",
  },
  {
    id: "glu-07", name: "Step-Up (Weighted)", muscle: "glutes",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Drive through the heel of the working leg. Controlled descent.",
  },
  {
    id: "glu-08", name: "Abduction Machine", muscle: "glutes",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Targets glute medius. Slow reps + hold at peak contraction.",
  },
  {
    id: "glu-09", name: "Donkey Kick", muscle: "glutes",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "On all fours. Keep core engaged, don't rotate hips.",
  },
  {
    id: "glu-10", name: "Single-Leg Hip Thrust", muscle: "glutes",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Harder than bilateral. Really isolates each glute.",
  },
  {
    id: "glu-11", name: "Barbell Squat", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Brace core, sit back and down. Knees track over toes. King of leg exercises.",
  },
  {
    id: "glu-12", name: "Leg Press (Wide Stance)", muscle: "glutes",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Feet high and wide on platform targets glutes more than quads.",
  },

  // ── CORE ──────────────────────────────────────────────────────────────
  {
    id: "core-01", name: "Plank", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "Squeeze everything — glutes, abs, quads. Don't let hips sag.",
  },
  {
    id: "core-02", name: "Dead Bug", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal", "all"],
    tips: "Lower back stays flat on floor. Slow and controlled.",
  },
  {
    id: "core-03", name: "Cable Crunch", muscle: "core",
    equipment: "cable", difficulty: "beginner",
    phases: ["follicular", "ovulation"],
    tips: "Round spine to crunch — don't just hinge at hips.",
  },
  {
    id: "core-04", name: "Hanging Leg Raise", muscle: "core",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["ovulation", "follicular"],
    tips: "Posterior pelvic tilt at the top. Avoid swinging.",
  },
  {
    id: "core-05", name: "Pallof Press", muscle: "core",
    equipment: "cable", difficulty: "intermediate",
    phases: ["all"],
    tips: "Anti-rotation core stability. Keep hips square, don't twist.",
  },
  {
    id: "core-06", name: "Ab Rollout", muscle: "core",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["follicular", "ovulation"],
    tips: "Hollow body position. Only go as far as you can control.",
  },
  {
    id: "core-07", name: "Russian Twist", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["luteal", "follicular"],
    tips: "Lean back 45°. Rotate from ribs, not shoulders.",
  },
  {
    id: "core-08", name: "Side Plank", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "Stack feet or stagger. Drive hip up — don't let it sag.",
  },
  {
    id: "core-09", name: "Bicycle Crunch", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["luteal", "follicular"],
    tips: "Slow down! Most people do these way too fast.",
  },
  {
    id: "core-10", name: "Farmer's Carry", muscle: "core",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["all"],
    tips: "Heavy weights, stand tall, walk with purpose. Best core exercise.",
  },

  // ── CARDIO ────────────────────────────────────────────────────────────
  {
    id: "car-01", name: "Walking (30 min)", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["menstrual", "all"],
    tips: "Best low-impact option during menstrual phase. Aim for 6-7k steps.",
  },
  {
    id: "car-02", name: "Treadmill Intervals", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "30s sprint / 60s walk × 10 rounds. Powerful fat burner.",
  },
  {
    id: "car-03", name: "Cycling (Zone 2)", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["luteal", "menstrual"],
    tips: "60-70% max HR. Can hold a conversation. Ideal for luteal phase.",
  },
  {
    id: "car-04", name: "Jump Rope", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["ovulation", "follicular"],
    tips: "Start with 3 sets of 2 min. Light on feet, wrists do the work.",
  },
  {
    id: "car-05", name: "Rowing Machine", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["follicular", "ovulation", "luteal"],
    tips: "60% legs, 20% body, 20% arms. Catch, drive, finish, recover.",
  },
  {
    id: "car-06", name: "Stairmaster", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Great glute activation + cardio combo. Don't hold the rails.",
  },
  {
    id: "car-07", name: "HIIT (20 min)", muscle: "cardio",
    equipment: "cardio", difficulty: "advanced",
    phases: ["ovulation"],
    tips: "Best saved for ovulation peak. 40s on / 20s off. Go all out.",
  },
  {
    id: "car-08", name: "Yoga / Stretching", muscle: "cardio",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "Yin or restorative yoga during menstrual phase. Honour rest.",
  },
  {
    id: "car-09", name: "Elliptical (40 min)", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["all"],
    tips: "Low impact, full body. Great option when energy is moderate.",
  },
  {
    id: "car-10", name: "Swimming", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "Zero impact on joints. Soothing during menstrual phase.",
  },
  {
    id: "car-11", name: "Sprint Intervals (Track)", muscle: "cardio",
    equipment: "cardio", difficulty: "advanced",
    phases: ["ovulation"],
    tips: "Peak phase only. Max effort 60-100m sprints. Full recovery between.",
  },
  // ── LEGS (new category) ───────────────────────────────────────────────
  {
    id: "leg-01", name: "Dumbbell Lunge", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Step forward, keep front shin vertical. Push through heel to return.",
  },
  {
    id: "leg-02", name: "Walking Dumbbell Lunge", muscle: "legs",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation", "luteal"],
    tips: "Continuous forward lunges. Great for glutes and quads. Keep torso upright.",
  },
  {
    id: "leg-03", name: "Barbell Lunge", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Bar on upper traps. Step long for more glute, short for more quad.",
  },
  {
    id: "leg-04", name: "Dumbbell RDL", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Hinge at hips, dumbbells track down legs. Feel hamstring stretch at bottom.",
  },
  {
    id: "leg-05", name: "Single-Leg Dumbbell RDL", muscle: "legs",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Balance on one leg, hinge forward. Works hamstrings and hip stabilisers.",
  },
  {
    id: "leg-06", name: "Goblet Squat", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Hold dumbbell at chest. Elbows inside knees at bottom. Great squat teacher.",
  },
  {
    id: "leg-07", name: "Dumbbell Sumo Squat", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Wide stance, toes out 45°. Hold one dumbbell vertically between legs.",
  },
  {
    id: "leg-08", name: "Dumbbell Step-Up", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Drive through heel of the working leg. Control the descent slowly.",
  },
  {
    id: "leg-09", name: "Leg Press", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Don't lock knees at top. Feet position changes muscle emphasis.",
  },
  {
    id: "leg-10", name: "Leg Extension", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Targets quads in isolation. Squeeze at top, slow controlled descent.",
  },
  {
    id: "leg-11", name: "Lying Leg Curl", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Keep hips flat on pad. Curl heel to glute. Hamstring isolation.",
  },
  {
    id: "leg-12", name: "Seated Leg Curl", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Different hamstring angle vs lying. Good complement to lying curl.",
  },
  {
    id: "leg-13", name: "Hack Squat", muscle: "legs",
    equipment: "machine", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Upright torso targets quads heavily. Go deep for full range.",
  },
  {
    id: "leg-14", name: "Barbell Front Squat", muscle: "legs",
    equipment: "barbell", difficulty: "advanced",
    phases: ["ovulation", "follicular"],
    tips: "Bar on front delts. Elbows up. Demands mobility but great quad builder.",
  },
  {
    id: "leg-15", name: "Reverse Lunge", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Step backwards. Easier on knees than forward lunge. More controlled.",
  },
  {
    id: "leg-16", name: "Dumbbell Curtsy Lunge", muscle: "legs",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Cross leg behind and to the side. Hits glute medius and abductors.",
  },
  {
    id: "leg-17", name: "Wall Sit", muscle: "legs",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "90° knee angle, back flat. Hold 30-60s. No equipment, great isometric.",
  },
  {
    id: "leg-18", name: "Box Jump", muscle: "legs",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["ovulation"],
    tips: "Soft landing, absorb through hips and knees. Step down, don't jump down.",
  },
  {
    id: "leg-19", name: "Jump Squat", muscle: "legs",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["ovulation", "follicular"],
    tips: "Explode up from squat position. Land soft. Builds power and burns fat.",
  },
  {
    id: "leg-20", name: "Nordic Hamstring Curl", muscle: "legs",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["follicular", "ovulation"],
    tips: "Kneel, anchor feet. Lower torso as slowly as possible. Elite hamstring builder.",
  },
  {
    id: "leg-21", name: "Calf Raise (Machine)", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Full range — from full stretch to full contraction. Slow and controlled.",
  },
  {
    id: "leg-22", name: "Dumbbell Calf Raise", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Stand on edge of step for greater range. Hold dumbbell in one hand.",
  },
  {
    id: "leg-23", name: "Sissy Squat", muscle: "legs",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["ovulation", "follicular"],
    tips: "Lean back as you squat. Extreme quad stretch. Hold something for balance.",
  },
  {
    id: "leg-24", name: "Dumbbell Split Squat", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["follicular", "luteal"],
    tips: "Both feet stationary. Front foot forward, back foot elevated or flat.",
  },

  // ── MORE GLUTES ──────────────────────────────────────────────────────
  {
    id: "glu-13", name: "Barbell Sumo Deadlift", muscle: "glutes",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Wide stance, toes out. Hips closer to bar. Targets glutes and inner thighs.",
  },
  {
    id: "glu-14", name: "Resistance Band Hip Thrust", muscle: "glutes",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "Band across hips. Drive through heels. Great for warm-up activation.",
  },
  {
    id: "glu-15", name: "Cable Hip Extension", muscle: "glutes",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Ankle attachment. Kick back and up. Squeeze glute at full extension.",
  },
  {
    id: "glu-16", name: "Dumbbell Hip Thrust", muscle: "glutes",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Dumbbell on hip crease. Drive hips up. Great starter for hip thrusts.",
  },
  {
    id: "glu-17", name: "Fire Hydrant", muscle: "glutes",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "all"],
    tips: "On all fours, lift knee to side. Targets glute medius. Add band for more.",
  },

  // ── MORE BACK ────────────────────────────────────────────────────────
  {
    id: "back-12", name: "Cable Pull-Over", muscle: "back",
    equipment: "cable", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Arms straight, pull bar to hips. Isolates lat with constant tension.",
  },
  {
    id: "back-13", name: "Dumbbell Pull-Over", muscle: "back",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["follicular", "luteal"],
    tips: "Lie across bench. Arc dumbbell behind head. Stretches lats and chest.",
  },
  {
    id: "back-14", name: "Chest-Supported Row", muscle: "back",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Lie on incline bench. Takes lower back out of the equation completely.",
  },
  {
    id: "back-15", name: "Rack Pull", muscle: "back",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Partial deadlift from knee height. Heavy upper back and trap builder.",
  },
  {
    id: "back-16", name: "Cable Straight-Arm Pulldown", muscle: "back",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Keep arms straight. Pull bar to thighs. Pure lat isolation.",
  },
  {
    id: "back-17", name: "Seal Row", muscle: "back",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lie on elevated bench, row barbell up. Chest supported for strict form.",
  },

  // ── MORE CHEST ───────────────────────────────────────────────────────
  {
    id: "chest-11", name: "Cable Crossover", muscle: "chest",
    equipment: "cable", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Cross hands at the end for a stronger contraction. Control the stretch.",
  },
  {
    id: "chest-12", name: "Pec Deck Machine", muscle: "chest",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Constant tension throughout. Don't let elbows go behind body at stretch.",
  },
  {
    id: "chest-13", name: "Dumbbell Floor Press", muscle: "chest",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["menstrual", "luteal"],
    tips: "Limits range of motion — gentler on shoulders. Great option with lower energy.",
  },
  {
    id: "chest-14", name: "Resistance Band Push-Up", muscle: "chest",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["all"],
    tips: "Band across back adds resistance. Progressive overload without weights.",
  },

  // ── MORE SHOULDERS ───────────────────────────────────────────────────
  {
    id: "sho-11", name: "Dumbbell Front Raise", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Slight bend in elbows. Lift to eye level only. Avoid swinging.",
  },
  {
    id: "sho-12", name: "Cable Front Raise", muscle: "shoulders",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Constant tension vs dumbbell. Slow and controlled throughout.",
  },
  {
    id: "sho-13", name: "Seated Dumbbell Press", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["follicular", "ovulation", "luteal"],
    tips: "Back support reduces injury risk. Great for beginners.",
  },
  {
    id: "sho-14", name: "Shrugs (Dumbbell)", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Straight up and down. No rolling. Squeeze traps at top for 1 second.",
  },
  {
    id: "sho-15", name: "Barbell Shrugs", muscle: "shoulders",
    equipment: "barbell", difficulty: "beginner",
    phases: ["follicular", "ovulation"],
    tips: "Heavier load than dumbbells possible. Great upper trap mass builder.",
  },

  // ── MORE ARMS ────────────────────────────────────────────────────────
  {
    id: "arms-11", name: "EZ Bar Curl", muscle: "arms",
    equipment: "barbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Angled grip reduces wrist strain vs straight bar. Heavy bicep builder.",
  },
  {
    id: "arms-12", name: "Cable Tricep Overhead Extension", muscle: "arms",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Rope attachment. Face away from cable. Long head stretch at top.",
  },
  {
    id: "arms-13", name: "Diamond Push-Up", muscle: "arms",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["all"],
    tips: "Hands form diamond shape. Elbows track back. Best bodyweight tricep move.",
  },
  {
    id: "arms-14", name: "Reverse Curl", muscle: "arms",
    equipment: "barbell", difficulty: "beginner",
    phases: ["follicular", "ovulation"],
    tips: "Overhand grip targets brachialis and brachioradialis. Good forearm builder.",
  },
  {
    id: "arms-15", name: "Zottman Curl", muscle: "arms",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Curl up with supinated grip, lower with pronated. Hits all bicep heads.",
  },
  {
    id: "arms-16", name: "Cable Curl (Rope)", muscle: "arms",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Rope allows natural wrist rotation. Squeeze and twist at the top.",
  },

  // ── MORE CORE ────────────────────────────────────────────────────────
  {
    id: "core-11", name: "Hollow Hold", muscle: "core",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lower back pressed to floor. Arms and legs extended low. Hold 20-40s.",
  },
  {
    id: "core-12", name: "V-Up", muscle: "core",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lift arms and legs simultaneously. Touch feet with hands at top.",
  },
  {
    id: "core-13", name: "Cable Wood Chop", muscle: "core",
    equipment: "cable", difficulty: "intermediate",
    phases: ["all"],
    tips: "Rotational core power. Keep arms straight. Drive from hips not arms.",
  },
  {
    id: "core-14", name: "Toe Touches", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "all"],
    tips: "Legs straight up, crunch up to touch toes. Lower back stays flat.",
  },
  {
    id: "core-15", name: "Mountain Climbers", muscle: "core",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Drive knees to chest alternately. Keep hips level. Great cardio-core combo.",
  },
  {
    id: "core-16", name: "Plank Hip Dip", muscle: "core",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "From side plank, dip hip to floor and raise. Oblique focus.",
  },
  {
    id: "core-17", name: "Stir the Pot", muscle: "core",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["follicular", "ovulation"],
    tips: "Elbows on Swiss ball, make circles. Anti-rotation and stability together.",
  },

  // ── MORE CARDIO ──────────────────────────────────────────────────────
  {
    id: "car-12", name: "Stair Climbing", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["all"],
    tips: "Real stairs or machine. Great low-impact glute and leg workout.",
  },
  {
    id: "car-13", name: "Dance / Zumba", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["follicular", "ovulation"],
    tips: "High oestrogen phase — you'll feel most coordinated and energetic. Have fun!",
  },
  {
    id: "car-14", name: "Pilates (Full Class)", muscle: "cardio",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["luteal", "menstrual"],
    tips: "Perfect for luteal/menstrual. Core stability, flexibility, low impact.",
  },
  {
    id: "car-15", name: "Battle Ropes", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["ovulation", "follicular"],
    tips: "30s on / 30s rest. Upper body cardio with core engagement.",
  },
  {
    id: "car-16", name: "Assault Bike (HIIT)", muscle: "cardio",
    equipment: "cardio", difficulty: "advanced",
    phases: ["ovulation"],
    tips: "10s all-out / 50s rest × 10. One of the most effective fat-burning tools.",
  },

  // ── MORE LEGS ─────────────────────────────────────────────────────────
  {
    id: "leg-25", name: "Barbell RDL", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation", "luteal"],
    tips: "Hip hinge, bar stays on legs. Feel hamstring stretch. Keep back neutral.",
  },
  {
    id: "leg-26", name: "Dumbbell Bulgarian Split Squat", muscle: "legs",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Rear foot on bench. Front shin vertical. One of the best unilateral leg moves.",
  },
  {
    id: "leg-27", name: "Smith Machine Squat", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Feet slightly forward. Machine guides the path — safer for beginners.",
  },
  {
    id: "leg-28", name: "Dumbbell Deadlift", muscle: "legs",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Great intro to deadlifting. Dumbbells allow natural arm path. Keep back flat.",
  },
  {
    id: "leg-29", name: "Trap Bar Deadlift", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Neutral grip, more upright torso. Combines squat and deadlift mechanics.",
  },
  {
    id: "leg-30", name: "Hip Abduction Machine", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Slow and controlled. Targets outer thigh and glute medius.",
  },
  {
    id: "leg-31", name: "Hip Adduction Machine", muscle: "legs",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Inner thigh focus. Squeeze at the end. Good complement to abduction.",
  },
  {
    id: "leg-32", name: "Barbell Back Squat (High Bar)", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Bar higher on traps. More upright torso. Emphasises quads.",
  },
  {
    id: "leg-33", name: "Pause Squat", muscle: "legs",
    equipment: "barbell", difficulty: "advanced",
    phases: ["follicular", "ovulation"],
    tips: "Pause 2s at bottom. Eliminates stretch reflex. Builds true strength.",
  },
  {
    id: "leg-34", name: "Tempo Squat", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "3s down, 1s pause, 1s up. Time under tension builds size and control.",
  },
  {
    id: "leg-35", name: "Pistol Squat", muscle: "legs",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["ovulation"],
    tips: "Single leg squat to floor. Use TRX to assist. Extreme balance challenge.",
  },
  {
    id: "leg-36", name: "Dumbbell Lateral Lunge", muscle: "legs",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Step to side, sit into hip. Targets inner thigh and glute medius.",
  },
  {
    id: "leg-37", name: "Cable Pull-Through", muscle: "legs",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Hip hinge pattern with cable between legs. Teaches RDL mechanics safely.",
  },
  {
    id: "leg-38", name: "Barbell Good Morning", muscle: "legs",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Bar on upper back, hinge forward. Intense hamstring and lower back stretch.",
  },
  {
    id: "leg-39", name: "Dumbbell Walking Lunge (No weight)", muscle: "legs",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "all"],
    tips: "Bodyweight lunges walking forward. Great warm-up or active recovery.",
  },
  {
    id: "leg-40", name: "Incline Treadmill Walk", muscle: "legs",
    equipment: "cardio", difficulty: "beginner",
    phases: ["all"],
    tips: "12% incline, 3mph, 30 min — the '12-3-30' method. Low impact leg and glute work.",
  },

  // ── MORE BACK ────────────────────────────────────────────────────────
  {
    id: "back-18", name: "Wide-Grip Pull-Up", muscle: "back",
    equipment: "bodyweight", difficulty: "advanced",
    phases: ["ovulation", "follicular"],
    tips: "Wider grip targets upper lats. Full dead hang at bottom.",
  },
  {
    id: "back-19", name: "Chin-Up (Close Grip)", muscle: "back",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Underhand narrow grip. More bicep involvement. Generally easier than pull-ups.",
  },
  {
    id: "back-20", name: "Assisted Pull-Up Machine", muscle: "back",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Counter-weight assists you. Reduce assistance progressively over weeks.",
  },
  {
    id: "back-21", name: "Cable Row (Wide Grip)", muscle: "back",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Wide bar attachment, elbows flare out. Targets upper back and rear delts.",
  },
  {
    id: "back-22", name: "Meadows Row", muscle: "back",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Landmine single-arm row. Great lat stretch. Hold at bottom for 1s.",
  },

  // ── MORE CHEST ───────────────────────────────────────────────────────
  {
    id: "chest-15", name: "Dumbbell Incline Fly", muscle: "chest",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "30-45° bench. Slight elbow bend throughout. Feel upper chest stretch.",
  },
  {
    id: "chest-16", name: "Low-to-High Cable Fly", muscle: "chest",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Cable at floor level, fly upward. Great upper chest activation.",
  },
  {
    id: "chest-17", name: "High-to-Low Cable Fly", muscle: "chest",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Cable at top, fly downward. Targets lower chest and sternal fibres.",
  },
  {
    id: "chest-18", name: "Incline Barbell Press", muscle: "chest",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "30-45° incline. Targets upper chest. Grip slightly narrower than flat bench.",
  },

  // ── MORE SHOULDERS ───────────────────────────────────────────────────
  {
    id: "sho-16", name: "Lateral Raise Machine", muscle: "shoulders",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Constant tension — no cheating. Great for high rep burnout sets (15-20 reps).",
  },
  {
    id: "sho-17", name: "W-Raise", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Lie face-down on incline. Make W shape. Rear delt and rhomboid activation.",
  },
  {
    id: "sho-18", name: "Cable Rear Delt Fly", muscle: "shoulders",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Cross cables at face height. Fly arms back. Better rear delt isolation than dumbbell.",
  },
  {
    id: "sho-19", name: "Dumbbell Lateral Raise (Seated)", muscle: "shoulders",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Seated removes momentum cheating. Strict form, slower tempo.",
  },

  // ── MORE ARMS ────────────────────────────────────────────────────────
  {
    id: "arms-17", name: "Spider Curl", muscle: "arms",
    equipment: "dumbbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lie face down on incline bench. Arms hang free. Peak bicep contraction.",
  },
  {
    id: "arms-18", name: "Cable Kickback", muscle: "arms",
    equipment: "cable", difficulty: "beginner",
    phases: ["all"],
    tips: "Bend over, elbow at side. Extend forearm fully back. Hard tricep squeeze.",
  },
  {
    id: "arms-19", name: "Cross Body Hammer Curl", muscle: "arms",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["all"],
    tips: "Curl across to opposite shoulder. Brachialis focus. Adds arm thickness.",
  },
  {
    id: "arms-20", name: "Barbell Overhead Tricep Extension", muscle: "arms",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Long head stretch overhead. Narrow grip EZ bar reduces wrist strain.",
  },

  // ── MORE CORE ────────────────────────────────────────────────────────
  {
    id: "core-18", name: "Hollow Hold", muscle: "core",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lower back pressed to floor. Arms and legs extended low. Hold 20-40s.",
  },
  {
    id: "core-19", name: "V-Up", muscle: "core",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Lift arms and legs simultaneously. Touch feet with hands at top.",
  },
  {
    id: "core-20", name: "Cable Wood Chop", muscle: "core",
    equipment: "cable", difficulty: "intermediate",
    phases: ["all"],
    tips: "Rotational core power. Keep arms straight. Drive from hips, not arms.",
  },
  {
    id: "core-21", name: "Mountain Climbers", muscle: "core",
    equipment: "bodyweight", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "Drive knees to chest alternately. Keep hips level. Great cardio-core combo.",
  },
  {
    id: "core-22", name: "Weighted Crunch", muscle: "core",
    equipment: "dumbbell", difficulty: "beginner",
    phases: ["follicular", "ovulation"],
    tips: "Hold weight at chest or overhead. More resistance than bodyweight crunch.",
  },
  {
    id: "core-23", name: "Landmine Rotation", muscle: "core",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Rotate barbell from hip to hip. Obliques and rotational power.",
  },

  // ── MORE GLUTES ──────────────────────────────────────────────────────
  {
    id: "glu-18", name: "Frog Pump", muscle: "glutes",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["menstrual", "all"],
    tips: "Feet together, soles touching. Hip thrust position. High rep activation.",
  },
  {
    id: "glu-19", name: "Banded Clamshell", muscle: "glutes",
    equipment: "bodyweight", difficulty: "beginner",
    phases: ["all"],
    tips: "Band above knees. Lie on side, rotate top knee up. Glute medius activation.",
  },
  {
    id: "glu-20", name: "45° Back Extension", muscle: "glutes",
    equipment: "machine", difficulty: "beginner",
    phases: ["all"],
    tips: "Round lower back to target glutes. Hold weight for progression.",
  },
  {
    id: "glu-21", name: "Kneeling Squat", muscle: "glutes",
    equipment: "barbell", difficulty: "intermediate",
    phases: ["follicular", "luteal"],
    tips: "Kneel on pad, bar on back. Sit back to heels and drive up. Pure glute focus.",
  },

  // ── MORE CARDIO ──────────────────────────────────────────────────────
  {
    id: "car-17", name: "Outdoor Run (Easy)", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["follicular", "luteal"],
    tips: "Conversational pace. Zone 2 cardio builds aerobic base over weeks.",
  },
  {
    id: "car-18", name: "Outdoor Run (Tempo)", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["ovulation", "follicular"],
    tips: "Comfortably hard pace. 20-40 min. Builds lactate threshold and speed.",
  },
  {
    id: "car-19", name: "Hiking", muscle: "cardio",
    equipment: "cardio", difficulty: "beginner",
    phases: ["all"],
    tips: "Low impact, high benefits. Great for menstrual phase. Nature reduces cortisol.",
  },
  {
    id: "car-20", name: "Spin Class", muscle: "cardio",
    equipment: "cardio", difficulty: "intermediate",
    phases: ["follicular", "ovulation"],
    tips: "High energy, motivating format. Great follicular/ovulation choice.",
  },

  // ── CHEST — additional ───────────────────────────────────────────────────
  { id: "chest-19", name: "Cable Fly (Low to High)", muscle: "chest", equipment: "cable", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Targets upper chest fibres. Keep slight elbow bend, squeeze at top." },
  { id: "chest-20", name: "Dumbbell Squeeze Press", muscle: "chest", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Press dumbbells together throughout the movement. Constant tension on pecs." },
  { id: "chest-21", name: "Machine Fly (Pec Deck)", muscle: "chest", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "Great isolation. Control the eccentric — 3 seconds back." },
  { id: "chest-22", name: "Push-Up (Wide Grip)", muscle: "chest", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Wider hand placement hits chest more than triceps. Keep core tight." },
  { id: "chest-23", name: "Smith Machine Incline Press", muscle: "chest", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "More stable than free bar. Good for overloading upper chest safely." },

  // ── BACK — additional ────────────────────────────────────────────────────
  { id: "back-23", name: "Straight Arm Pulldown", muscle: "back", equipment: "cable", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Isolates lats. Keep arms straight, hinge at shoulder only." },
  { id: "back-24", name: "Dumbbell Row (Chest Supported)", muscle: "back", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Lie on incline bench. Removes lower back strain. Full range of motion." },
  { id: "back-25", name: "Rack Deadlift", muscle: "back", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Start from knee height. Heavier loading without full hip hinge." },
  { id: "back-26", name: "Single Arm Lat Pulldown", muscle: "back", equipment: "cable", difficulty: "intermediate", phases: ["all"], tips: "Corrects imbalances. Focus on lat activation, not arm pulling." },
  { id: "back-27", name: "Pendlay Row", muscle: "back", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Bar starts on floor each rep. Explosive pull. Great for strength." },

  // ── SHOULDERS — additional ───────────────────────────────────────────────
  { id: "sho-20", name: "Leaning Lateral Raise", muscle: "shoulders", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Hold onto rack, lean away. Longer range of motion for side delt." },
  { id: "sho-21", name: "Cable Y-Raise", muscle: "shoulders", equipment: "cable", difficulty: "intermediate", phases: ["all"], tips: "Low cable, raise arms in Y shape. Targets rear delt and traps." },
  { id: "sho-22", name: "Dumbbell Cuban Press", muscle: "shoulders", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "External rotation + press combo. Excellent shoulder health exercise." },
  { id: "sho-23", name: "Barbell Push Press", muscle: "shoulders", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Slight leg drive helps push heavier. Great for power development." },
  { id: "sho-24", name: "Behind-Neck Press (Light)", muscle: "shoulders", equipment: "barbell", difficulty: "advanced", phases: ["follicular"], tips: "Only if fully warmed up and mobile. Targets rear delt. Use light weight." },

  // ── ARMS — additional ────────────────────────────────────────────────────
  { id: "arms-21", name: "Cable Overhead Curl", muscle: "arms", equipment: "cable", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "High cable, curl toward head. Long head of bicep fully stretched." },
  { id: "arms-22", name: "Dumbbell Tate Press", muscle: "arms", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Elbows flared, lower dumbbells to chest. Targets tricep medial head." },
  { id: "arms-23", name: "Close Grip Bench Press", muscle: "arms", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Shoulder-width grip. Heavy tricep compound. Great strength builder." },
  { id: "arms-24", name: "Reverse Grip Curl", muscle: "arms", equipment: "barbell", difficulty: "beginner", phases: ["all"], tips: "Overhand grip. Hits brachialis and brachioradialis. Good for arm thickness." },
  { id: "arms-25", name: "JM Press", muscle: "arms", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Hybrid between skull crusher and close grip press. Great tricep mass builder." },
  { id: "arms-26", name: "Cable Hammer Curl", muscle: "arms", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Rope attachment, neutral grip. Constant tension. Great for forearm thickness." },

  // ── LEGS — additional ────────────────────────────────────────────────────
  { id: "leg-41", name: "Leg Press (Feet High)", muscle: "legs", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "Higher foot placement shifts load to hamstrings and glutes." },
  { id: "leg-42", name: "Leg Press (Feet Low)", muscle: "legs", equipment: "machine", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Lower foot placement targets quads more. Great quad burnout set." },
  { id: "leg-43", name: "Copenhagen Plank", muscle: "legs", equipment: "bodyweight", difficulty: "advanced", phases: ["all"], tips: "Adductor strength. Side plank with top leg supported on bench." },
  { id: "leg-44", name: "Reverse Nordics", muscle: "legs", equipment: "bodyweight", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Kneel, lean back slowly. Eccentric quad strength. Injury prevention." },
  { id: "leg-45", name: "Single Leg Press", muscle: "legs", equipment: "machine", difficulty: "intermediate", phases: ["all"], tips: "Corrects imbalances. Use same load each side." },
  { id: "leg-46", name: "Heel Elevated Squat", muscle: "legs", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Plates or wedge under heels. Deeper quad engagement, less ankle mobility needed." },
  { id: "leg-47", name: "Landmine Squat", muscle: "legs", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Barbell in landmine, goblet style. Spine-friendly squat variant." },
  { id: "leg-48", name: "Leg Curl (Seated)", muscle: "legs", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "More hamstring stretch than lying version. Control the eccentric." },
  { id: "leg-49", name: "Step Mill (Stairmaster)", muscle: "legs", equipment: "cardio", difficulty: "intermediate", phases: ["follicular", "luteal"], tips: "Great glute and leg conditioning. Zone 2 intensity for 20-30 min." },
  { id: "leg-50", name: "Calf Raise (Smith Machine)", muscle: "legs", equipment: "barbell", difficulty: "beginner", phases: ["all"], tips: "Heavier loading for calves. Pause at top and bottom." },

  // ── GLUTES — additional ──────────────────────────────────────────────────
  { id: "glu-22", name: "B-Stance Hip Thrust", muscle: "glutes", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "One foot forward, one back. Unilateral loading, corrects imbalances." },
  { id: "glu-23", name: "Cable Kickback (Ankle)", muscle: "glutes", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Ankle strap, hinge forward. Isolates glute max. Control the return." },
  { id: "glu-24", name: "Glute Bridge (Feet Elevated)", muscle: "glutes", equipment: "bodyweight", difficulty: "intermediate", phases: ["all"], tips: "Feet on bench increases range. Greater glute stretch at bottom." },
  { id: "glu-25", name: "Sumo Deadlift", muscle: "glutes", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Wide stance, toes out. More hip/glute, less lower back than conventional." },
  { id: "glu-26", name: "Reverse Hyper", muscle: "glutes", equipment: "machine", difficulty: "intermediate", phases: ["all"], tips: "Decompresses spine while training glutes. If machine available, use it." },
  { id: "glu-27", name: "Seated Abduction (Machine)", muscle: "glutes", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "Slow and controlled. Great glute med isolation. High reps work well." },

  // ── CORE — additional ────────────────────────────────────────────────────
  { id: "core-24", name: "Suitcase Carry", muscle: "core", equipment: "dumbbell", difficulty: "intermediate", phases: ["all"], tips: "Heavy dumbbell in one hand, walk 20m. Oblique anti-lateral flexion." },
  { id: "core-25", name: "Bear Crawl", muscle: "core", equipment: "bodyweight", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "4-point position, knees hover 2cm off ground. Full body stability." },
  { id: "core-26", name: "Hollow Body Rock", muscle: "core", equipment: "bodyweight", difficulty: "intermediate", phases: ["all"], tips: "Arms overhead, lower back pressed to floor. Rock forward and back." },
  { id: "core-27", name: "Dragon Flag (Negatives)", muscle: "core", equipment: "bodyweight", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Lower slowly from top position. One of the best anterior chain exercises." },
  { id: "core-28", name: "Cable Oblique Crunch", muscle: "core", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Side cable crunch. Targets obliques more directly than rotation." },
  { id: "core-29", name: "TRX Fallout", muscle: "core", equipment: "other", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Similar to ab rollout but suspended. Longer lever = harder." },

  // ── CARDIO — additional ──────────────────────────────────────────────────
  { id: "car-21", name: "Sled Push", muscle: "cardio", equipment: "other", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "10-20m sprints. Full body power. Low injury risk, high output." },
  { id: "car-22", name: "Sled Pull", muscle: "cardio", equipment: "other", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Harness or handle. Great for hamstrings and conditioning." },
  { id: "car-23", name: "Ski Erg", muscle: "cardio", equipment: "cardio", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Full body pulling machine. Great low-impact high-intensity option." },
  { id: "car-24", name: "Kettlebell Swing", muscle: "cardio", equipment: "other", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Explosive hip hinge. 15-20 reps. Glutes, hamstrings, and cardio." },
  { id: "car-25", name: "Cycling (Outdoor)", muscle: "cardio", equipment: "cardio", difficulty: "beginner", phases: ["all"], tips: "Zone 2 for 45-90 min. One of the best aerobic base builders." },
  { id: "car-26", name: "Water Aerobics", muscle: "cardio", equipment: "cardio", difficulty: "beginner", phases: ["menstrual", "luteal"], tips: "Low impact, reduces cramping. Excellent menstrual phase option." },
  { id: "car-27", name: "Yoga (Restorative)", muscle: "cardio", equipment: "other", difficulty: "beginner", phases: ["menstrual", "luteal"], tips: "Yin or restorative style. Reduces cortisol and supports recovery." },
  { id: "car-28", name: "Barre Class", muscle: "cardio", equipment: "other", difficulty: "beginner", phases: ["all"], tips: "Ballet-inspired. Great for small muscle endurance and posture." },

  // ── CALVES (new category) ─────────────────────────────────────────────────
  { id: "cal-01", name: "Standing Calf Raise", muscle: "legs", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Slow and controlled. 3 seconds up, pause, 3 seconds down. Full range of motion." },
  { id: "cal-02", name: "Seated Calf Raise", muscle: "legs", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "Targets soleus (deeper calf muscle). Knee bent changes which muscle works." },
  { id: "cal-03", name: "Calf Raise (Dumbbell)", muscle: "legs", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Hold dumbbells at sides or on knees if seated. Full range, no bouncing." },
  { id: "cal-04", name: "Single-Leg Calf Raise", muscle: "legs", equipment: "bodyweight", difficulty: "intermediate", phases: ["all"], tips: "One leg at a time. Much harder than bilateral. Essential for fixing imbalances." },
  { id: "cal-05", name: "Donkey Calf Raise", muscle: "legs", equipment: "machine", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Hip-hinge position increases stretch. One of the best calf builders." },
  { id: "cal-06", name: "Calf Raise on Step", muscle: "legs", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Edge of step allows deeper stretch at bottom. Greater range = more growth." },
  { id: "cal-07", name: "Smith Machine Calf Raise", muscle: "legs", equipment: "barbell", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Bar on traps. Heavy load possible. Pause at top for peak contraction." },
  { id: "cal-08", name: "Tibialis Raise", muscle: "legs", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Lean against wall, lift toes up. Prevents shin splints, balances calf training." },
  { id: "cal-09", name: "Banded Calf Raise", muscle: "legs", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Band around toes adds resistance. Good home option with no equipment." },
  { id: "cal-10", name: "Weighted Calf Raise", muscle: "legs", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Barbell on shoulders or holding plate. Progressive overload for calf hypertrophy." },

  // ── CORE — basics that were missing ───────────────────────────────────────
  { id: "cor-30", name: "Crunches", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Focus on the contraction, not the range of motion. Exhale at the top." },
  { id: "cor-31", name: "Sit-Ups", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Full range ab exercise. Anchor feet or use a decline bench for added challenge." },
  { id: "cor-32", name: "Leg Raises (Lying)", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Keep lower back pressed into floor. Slow the lowering phase — that's where it works." },
  { id: "cor-33", name: "Flutter Kicks", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Legs low, alternate kicks. Keep lower back flat. Great hip flexor and lower ab endurance." },
  { id: "cor-34", name: "Reverse Crunch", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Curl hips up toward chest. Better for lower abs than standard crunch." },
  { id: "cor-35", name: "Bicycle Crunch", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Slow and controlled. One of the highest EMG-activated ab exercises." },
  { id: "cor-36", name: "Toes to Bar", muscle: "core", equipment: "bodyweight", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Hanging, bring toes to bar. Full anterior chain. Progress from knee raises first." },
  { id: "cor-37", name: "Hanging Knee Raises", muscle: "core", equipment: "bodyweight", difficulty: "intermediate", phases: ["all"], tips: "Easier progression to toes to bar. Pull knees to chest, control the lowering." },
  { id: "cor-38", name: "Bird Dog", muscle: "core", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Opposite arm and leg. Anti-rotation core stability. Great for lower back health." },
  { id: "cor-39", name: "Decline Sit-Up", muscle: "core", equipment: "machine", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Decline bench increases range of motion. Can add weight for progressive overload." },
  { id: "cor-40", name: "Woodchopper (Cable)", muscle: "core", equipment: "cable", difficulty: "intermediate", phases: ["all"], tips: "Rotational power. High-to-low and low-to-high variations. Keep hips stable." },
  { id: "cor-41", name: "Side Bend (Dumbbell)", muscle: "core", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Controlled lateral flexion. One side at a time. Targets obliques." },
  { id: "cor-42", name: "Weighted Sit-Up", muscle: "core", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Hold plate or dumbbell at chest or overhead. Progressive overload for abs." },

  // ── CARDIO — basics that were missing ─────────────────────────────────────
  { id: "car-29", name: "Running", muscle: "cardio", equipment: "cardio", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Best in follicular and ovulation phase when energy is high. Avoid in luteal if fatigued." },
  { id: "car-30", name: "Sprinting", muscle: "cardio", equipment: "cardio", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Short maximal efforts 20-60m. Peak power output. Best in ovulation phase." },
  { id: "car-31", name: "Incline Walking", muscle: "cardio", equipment: "cardio", difficulty: "beginner", phases: ["all"], tips: "8-12% incline, 3-4 mph. Low impact, high glute and calorie burn. Good for all phases." },
  { id: "car-32", name: "Boxing / Kickboxing", muscle: "cardio", equipment: "other", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "High energy, stress-relieving. Excellent follicular and ovulation choice when confidence peaks." },
  { id: "car-33", name: "Burpees", muscle: "cardio", equipment: "bodyweight", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Full body conditioning. Scale with step-out version if needed. Rest as needed between sets." },
  { id: "car-34", name: "Jump Lunges", muscle: "cardio", equipment: "bodyweight", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Plyometric lower body. Builds power and coordination. Land softly to protect joints." },
  { id: "car-35", name: "High Knees", muscle: "cardio", equipment: "bodyweight", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Drive knees to hip height. Keep core tight. Great warm-up or finisher." },
  { id: "car-36", name: "Jumping Jacks", muscle: "cardio", equipment: "bodyweight", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Classic warm-up. Low impact version: step out instead of jump." },
  { id: "car-37", name: "Tabata", muscle: "cardio", equipment: "bodyweight", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "20 sec on, 10 sec off, 8 rounds = 4 min. Maximally intense. Only in high energy phases." },
  { id: "car-38", name: "Agility Ladder", muscle: "cardio", equipment: "other", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Improves coordination, footwork, and reaction time. Great warm-up for leg day." },
  { id: "car-39", name: "Farmer Walk", muscle: "cardio", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Heavy dumbbells, walk 20-40m. Full body strength endurance. Great core and grip." },
  { id: "car-40", name: "Shadow Boxing", muscle: "cardio", equipment: "bodyweight", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "No equipment needed. Great stress outlet. Combine with footwork for full cardio session." },

  // ── BACK — missing basics ─────────────────────────────────────────────────
  { id: "bck-28", name: "Chin-Up", muscle: "back", equipment: "bodyweight", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Supinated (underhand) grip. More bicep involvement than pull-up. Great for beginners to pull-ups." },
  { id: "bck-29", name: "Wide Grip Pulldown", muscle: "back", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Wider than shoulder grip. Emphasises outer lats for a wider back appearance." },
  { id: "bck-30", name: "Close Grip Pulldown", muscle: "back", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Neutral grip attachment. More range of motion. Hits lower lats more." },
  { id: "bck-31", name: "Reverse Fly (Dumbbell)", muscle: "back", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Hinge forward, fly arms back. Essential rear delt and rhomboid exercise. Use light weight." },
  { id: "bck-32", name: "Superman Hold", muscle: "back", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Lie prone, lift arms and legs. Erector spinae and glutes. Hold 2-3 seconds at top." },
  { id: "bck-33", name: "Dead Hang", muscle: "back", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Hang from bar, fully relaxed. Decompresses spine, improves grip, builds shoulder health." },
  { id: "bck-34", name: "Ring Row", muscle: "back", equipment: "other", difficulty: "intermediate", phases: ["all"], tips: "Body at angle under rings or bar. Horizontal pull. Great assisted pull-up progression." },

  // ── HAMSTRINGS — missing ──────────────────────────────────────────────────
  { id: "ham-06", name: "Nordic Curl", muscle: "legs", equipment: "bodyweight", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Kneel, lower body to floor using hamstrings only. One of the best hamstring injury prevention exercises." },
  { id: "ham-07", name: "Glute-Ham Raise", muscle: "legs", equipment: "machine", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "GHD machine. Full hamstring and glute activation through complete range of motion." },
  { id: "ham-08", name: "Slider Leg Curl", muscle: "legs", equipment: "bodyweight", difficulty: "intermediate", phases: ["all"], tips: "Heels on sliders or towel, bridge up and curl feet in. Great home alternative to machine." },
  { id: "ham-09", name: "Single-Leg Curl (Machine)", muscle: "legs", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "One leg at a time. Fixes imbalances. Same load both sides." },
  { id: "ham-10", name: "Banded Leg Curl", muscle: "legs", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Band around ankle and anchor point. Simple home hamstring isolation." },

  // ── HIP HINGE — missing deadlift variations ───────────────────────────────
  { id: "hip-10", name: "Conventional Deadlift", muscle: "back", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Hip-width stance, overhand or mixed grip. The king of posterior chain exercises. Brace core hard." },
  { id: "hip-11", name: "Stiff-Leg Deadlift", muscle: "legs", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Minimal knee bend. Targets hamstrings and glutes more than conventional. Feel the stretch." },
  { id: "hip-12", name: "Deficit Deadlift", muscle: "back", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Stand on 5-10cm platform. Greater range of motion. Builds off the floor strength." },
  { id: "hip-13", name: "Snatch Grip Deadlift", muscle: "back", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Very wide grip. Increases ROM and upper back demand. Great for athletic development." },
  { id: "hip-14", name: "Jefferson Deadlift", muscle: "legs", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Straddle the bar. Unique asymmetric loading. Great for hip mobility and variety." },
  { id: "hip-15", name: "Kettlebell Deadlift", muscle: "legs", equipment: "other", difficulty: "beginner", phases: ["all"], tips: "Perfect beginner hip hinge pattern. Kettlebell between feet. Teaches neutral spine." },

  // ── BICEPS — Dumbbell Bicep Curl + other missing ───────────────────────────
  { id: "bic-21", name: "Dumbbell Bicep Curl", muscle: "arms", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Classic. Full supination at top. Don't swing — slow controlled reps beat heavy sloppy ones." },
  { id: "bic-22", name: "Drag Curl", muscle: "arms", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Drag bar up the body as you curl. Elbows travel back. Hits long head of bicep uniquely." },
  { id: "bic-23", name: "21s Curls", muscle: "arms", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "7 bottom half + 7 top half + 7 full reps. Huge time under tension. Brutal pump." },
  { id: "bic-24", name: "Incline Dumbbell Curl", muscle: "arms", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Lying back on incline bench, arms hang. Maximum stretch on long head bicep." },
  { id: "bic-25", name: "Wrist Curl", muscle: "arms", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Forearm resting on bench, curl wrist up. Builds forearm flexors and grip strength." },
  { id: "bic-26", name: "Forearm Curl (Reverse)", muscle: "arms", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Overhand wrist curl. Hits forearm extensors. Pairs well with regular wrist curls." },
  { id: "bic-27", name: "Resistance Band Curl", muscle: "arms", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Stand on band, curl up. Great home option. Band tension increases at peak contraction." },
  { id: "bic-28", name: "Static Hold Curl", muscle: "arms", equipment: "dumbbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Hold at 90° while other arm curls, then switch. Massive time under tension." },

  // ── TRICEPS — missing basics ──────────────────────────────────────────────
  { id: "tri-21", name: "Bench Dip", muscle: "arms", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Hands on bench behind you, lower body. Beginner tricep exercise. Keep elbows close." },
  { id: "tri-22", name: "Rope Pushdown", muscle: "arms", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Rope attachment, split at bottom for full contraction. Most popular cable tricep exercise." },
  { id: "tri-23", name: "Band Pushdown", muscle: "arms", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Band over door or bar. Great warm-up or home tricep exercise. High reps work well." },
  { id: "tri-24", name: "Weighted Dip", muscle: "arms", equipment: "bodyweight", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Belt with weight plates. One of the best tricep mass builders. Lean forward for more chest." },
  { id: "tri-25", name: "Reverse Grip Pushdown", muscle: "arms", equipment: "cable", difficulty: "beginner", phases: ["all"], tips: "Underhand grip on bar. Hits long head and medial head differently. Great variation." },
  { id: "tri-26", name: "EZ Bar Skull Crusher", muscle: "arms", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "EZ bar easier on wrists than straight bar. Lower to forehead, extend up. Control fully." },

  // ── SHOULDERS — missing ───────────────────────────────────────────────────
  { id: "sho-25", name: "Front Raise (Dumbbell)", muscle: "shoulders", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Anterior deltoid isolation. Light weight, controlled. Avoid shrugging at top." },
  { id: "sho-26", name: "Rear Delt Raise (Bent Over)", muscle: "shoulders", equipment: "dumbbell", difficulty: "beginner", phases: ["all"], tips: "Hinge forward, raise arms to sides. Critical for shoulder health and posture. Go light." },
  { id: "sho-27", name: "Plate Raise", muscle: "shoulders", equipment: "other", difficulty: "beginner", phases: ["all"], tips: "Hold weight plate, raise to eye level. Simple anterior delt exercise. Control the lowering." },
  { id: "sho-28", name: "Resistance Band Lateral Raise", muscle: "shoulders", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Stand on band, raise to sides. Constant tension on side delts. Great home shoulder exercise." },
  { id: "sho-29", name: "Reverse Pec Deck", muscle: "shoulders", equipment: "machine", difficulty: "beginner", phases: ["all"], tips: "Face the pec deck machine, pull handles back. Isolates rear delts. Great for posture." },

  // ── CHEST — missing variations ────────────────────────────────────────────
  { id: "che-24", name: "Incline Barbell Press", muscle: "chest", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "30-45° incline targets upper chest. One of the best upper chest builders." },
  { id: "che-25", name: "Wide Grip Bench Press", muscle: "chest", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Wider than shoulder grip. More chest, less tricep. Watch shoulder health with very wide grip." },
  { id: "che-26", name: "Pause Bench Press", muscle: "chest", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "1-2 second pause at chest. Eliminates stretch reflex. Great for strength and control." },

  // ── SQUATS — missing variations ───────────────────────────────────────────
  { id: "sqt-16", name: "Box Squat", muscle: "legs", equipment: "barbell", difficulty: "intermediate", phases: ["follicular", "ovulation"], tips: "Squat to box, pause, drive up. Teaches proper depth and breaks the squat-bounce habit." },
  { id: "sqt-17", name: "Zercher Squat", muscle: "legs", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Bar in crook of elbows. Unique loading. Forces upright torso. Great for upper back strength." },
  { id: "sqt-18", name: "Overhead Squat", muscle: "legs", equipment: "barbell", difficulty: "advanced", phases: ["follicular", "ovulation"], tips: "Bar overhead, squat to depth. Requires excellent mobility. Best mobility indicator exercise." },

  // ── GLUTES — missing ──────────────────────────────────────────────────────
  { id: "glu-28", name: "Banded Lateral Walk", muscle: "glutes", equipment: "bodyweight", difficulty: "beginner", phases: ["all"], tips: "Band above knees, step side to side. Essential glute med activation. Great warm-up." },
  { id: "glu-29", name: "Walking Lunge", muscle: "glutes", equipment: "bodyweight", difficulty: "beginner", phases: ["follicular", "ovulation"], tips: "Step forward into lunge, alternate legs. Adds cardio element to lunge. Can hold dumbbells." },
  { id: "glu-30", name: "Curtsy Lunge", muscle: "glutes", equipment: "bodyweight", difficulty: "intermediate", phases: ["all"], tips: "Step behind and across. Targets glute med and outer glute more than regular lunge." },
];


export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return EXERCISES.filter((e) => e.muscle === muscle);
}

export function getExercisesForPhase(phase: string): Exercise[] {
  return EXERCISES.filter(
    (e) => e.phases.includes(phase as PhaseTag) || e.phases.includes("all")
  );
}

export function searchExercises(query: string): Exercise[] {
  const q = query.toLowerCase();
  return EXERCISES.filter((e) => e.name.toLowerCase().includes(q));
}
