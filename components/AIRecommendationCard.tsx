"use client";

// components/AIRecommendationCard.tsx
import { useState } from "react";
import { PhaseData } from "@/lib/cycle";

interface Props {
  phaseData: PhaseData;
  goals?: string[];
  bodyGoal?: string | null;
  cycleDay?: number;
}

// ── Message bank ──────────────────────────────────────────────────────────
// Each phase has multiple messages with different angles.
// Selected by: (cycleDay - phaseStart) % messages.length
// Add more messages later — just push to the array.

const phaseMessages: Record<string, { category: string; text: string }[]> = {
  menstrual: [
    {
      category: "Rest & allow",
      text: "Your uterine lining is shedding and your body is working hard even when you're still. Rest today isn't laziness — it's the most productive thing you can do. Honour that and skip the gym guilt.",
    },
    {
      category: "Nutrition focus",
      text: "Iron losses are highest in the first two days. A single serving of red meat or lentils replaces most of what you're losing. Pair it with vitamin C — a squeeze of lemon triples absorption.",
    },
    {
      category: "Movement tip",
      text: "Gentle movement actually reduces cramping — prostaglandins that cause pain are cleared faster with light circulation. A 20-min walk or yin yoga session beats ibuprofen alone and costs nothing.",
    },
    {
      category: "Mindset",
      text: "You're in the introspective phase of your cycle. Decisions made now tend to be more intuitive and honest. This is a good day to journal, reflect, or reassess a goal — not a day to push hard.",
    },
    {
      category: "Transition",
      text: "Oestrogen is beginning to rise from its lowest point. You may notice a subtle lift in mood or energy today — that's your follicular phase arriving early. The real climb starts tomorrow.",
    },
  ],
  follicular: [
    {
      category: "Strength window",
      text: "Rising oestrogen increases muscle protein synthesis and raises your pain threshold. Your body responds better to hard training this week than at any other point in your cycle. Add weight today.",
    },
    {
      category: "Try something new",
      text: "Follicular phase is when your brain genuinely craves novelty — dopamine is elevated. This is the best time to try a new class, learn a new lift, or test a training style you've been avoiding.",
    },
    {
      category: "Gut health",
      text: "Oestrogen is metabolised in the gut. Fermented foods like kimchi, yogurt, and kefir this week support your microbiome's ability to process hormones cleanly — directly affecting how you feel in luteal.",
    },
    {
      category: "Social energy",
      text: "Serotonin and dopamine are both elevated this week. You'll find social interaction easier and more rewarding than at any other point in your cycle. Book the class, call the friend, say yes.",
    },
  ],
  ovulation: [
    {
      category: "Peak performance",
      text: "Testosterone briefly spikes alongside peak oestrogen today. Research shows women are measurably stronger and have higher VO2 max during ovulation. Schedule your heaviest session or PR attempt now.",
    },
    {
      category: "Fuel the peak",
      text: "Your metabolism is running hot and you're burning more carbohydrates than usual right now. Don't undereat on your highest-output days. A proper pre-workout meal isn't optional — it's part of the strategy.",
    },
    {
      category: "Injury awareness",
      text: "High oestrogen loosens ligaments and ACL injury risk is statistically elevated around ovulation. Warm up longer than usual, focus on landing mechanics, and don't rush through any instability work.",
    },
  ],
  luteal: [
    {
      category: "Early luteal",
      text: "Early luteal is actually solid for strength endurance — progesterone hasn't fully peaked yet. Keep training at your normal intensity and don't downgrade just because the phase label says luteal.",
    },
    {
      category: "Temperature & hydration",
      text: "Your resting body temperature is 0.3–0.5°C higher this phase. You'll feel more fatigued at the same effort level — that's physiology, not weakness. Hydrate more than usual and adjust your expectations.",
    },
    {
      category: "Cravings science",
      text: "Cravings this week aren't weakness — progesterone raises your basal metabolic rate by up to 300 kcal/day. Your body needs more fuel. Eating more complex carbs now prevents the late-night binge cycle.",
    },
    {
      category: "Magnesium",
      text: "Magnesium drops in the luteal phase — this directly causes PMS symptoms including cramps, anxiety, and poor sleep. Dark chocolate, almonds, and spinach aren't treats right now. They're medicine.",
    },
    {
      category: "Late luteal",
      text: "Both oestrogen and progesterone are falling now. Your nervous system is more reactive, sleep is lighter, and recovery is slower. Cut volume, not intensity — one fewer set per exercise is enough.",
    },
    {
      category: "Reframe the phase",
      text: "Luteal isn't a phase to just survive. Progesterone has a calming, focused quality — detail-oriented work, organisation, and deep single-task focus are genuinely easier now. Use it differently, not less.",
    },
  ],
};

// Phase start days (standard 28-day cycle)
const PHASE_STARTS: Record<string, number> = {
  menstrual: 1,
  follicular: 6,
  ovulation: 14,
  luteal: 17,
};

// Body goal tips per phase
const bodyGoalTips: Record<string, Record<string, string>> = {
  cut: {
    menstrual:  "On a cut, don't restrict further during your period — your body needs fuel to repair. Hit protein targets and eat at maintenance this week to preserve muscle.",
    follicular: "Rising oestrogen boosts fat oxidation. Fasted morning cardio + strength training is a powerful combo this week. Stick to your deficit.",
    ovulation:  "Peak metabolism — your body burns ~100 extra kcal/day naturally. This is the best time for HIIT on a cut. Eat enough carbs to fuel the session.",
    luteal:     "Cravings spike due to progesterone. Plan snacks in advance — Greek yogurt, dark chocolate, almonds — to stay in deficit without white-knuckling it.",
  },
  bulk: {
    menstrual:  "Training volume drops naturally — use this week for calorie cycling. You can eat closer to maintenance without losing muscle.",
    follicular: "Prime muscle-building window. Increase calories slightly before heavy sessions. Progressive overload this week pays dividends.",
    ovulation:  "Go heavy. Testosterone peaks alongside oestrogen — your anabolic environment is at its best. Eat your biggest meals around training today.",
    luteal:     "Keep calories up despite lower energy. Your body uses more carbs as fuel during the luteal phase — don't under-eat.",
  },
  recomposition: {
    menstrual:  "Recomp requires patience. This week prioritise recovery and protein. Body composition changes happen over cycles, not days.",
    follicular: "The follicular phase is your best recomp window — muscle synthesis is elevated and fat burning is efficient simultaneously.",
    ovulation:  "Peak anabolic environment. Train hard and eat to match — this is when recomp happens fastest.",
    luteal:     "Focus on maintaining training performance rather than setting PRs. Consistent effort this week protects your recomp progress.",
  },
};

const goalTips: Record<string, Record<string, string>> = {
  "Build muscle": {
    menstrual:  "Maintain protein intake even at rest — muscle isn't built only in the gym. Rest days are when growth happens.",
    follicular: "Your prime window for hypertrophy. Increase progressive overload — add reps, weight, or sets this week.",
    ovulation:  "Testosterone briefly peaks — attempt your heaviest compound sets. This is rare physiological prime time.",
    luteal:     "Focus on maintaining your lifts. Consistency here prevents muscle loss before next cycle.",
  },
  "Lose fat": {
    menstrual:  "Light movement keeps metabolism active. Don't restrict calories during bleeding — it backfires hormonally.",
    follicular: "Rising oestrogen boosts fat oxidation. Fasted cardio in the morning is highly effective now.",
    ovulation:  "High intensity burns the most fat today. HIIT and heavy lifting both spike EPOC.",
    luteal:     "Cravings are real and hormonal. Eat enough stable carbs to avoid binge eating at night.",
  },
  "Improve endurance": {
    menstrual:  "Zone 2 easy runs are fine. Keep intensity low — your blood volume is temporarily reduced.",
    follicular: "Build your aerobic base. Longer runs at moderate pace are ideal this week.",
    ovulation:  "Race day energy is here. Set a new distance or pace PR — VO2 max is at its peak.",
    luteal:     "Higher body temperature slows pace slightly. Hydrate more and expect slightly slower splits.",
  },
  "Reduce PMS symptoms": {
    menstrual:  "You're through the worst. Magnesium foods and quality sleep are your best medicine today.",
    follicular: "Oestrogen rising naturally reduces inflammation. Build healthy habits now for next luteal phase.",
    ovulation:  "Enjoy your peak mood. Store up positive energy — it helps buffer the luteal phase ahead.",
    luteal:     "Magnesium (dark chocolate, almonds), B6 (turkey, banana), and omega-3 directly reduce PMS. Prioritise these.",
  },
  "Better sleep": {
    menstrual:  "Progesterone is low — sleep is lighter. Magnesium glycinate before bed helps significantly.",
    follicular: "Oestrogen improves sleep architecture. Sleep quality is naturally best this week.",
    ovulation:  "High energy can make winding down harder. Avoid screens 1hr before bed.",
    luteal:     "Rising progesterone causes grogginess but disrupts deep sleep. Consistent sleep schedule is critical.",
  },
  "More energy": {
    menstrual:  "Iron-rich foods (spinach, red meat) and B12 directly combat fatigue during your period.",
    follicular: "Your energy naturally climbs. Capitalise with morning workouts for an all-day boost.",
    ovulation:  "You're at maximum energy. Channel it into your hardest workouts and most demanding tasks.",
    luteal:     "Complex carbs every 3-4 hours prevent the energy crashes that progesterone causes.",
  },
};

const BODY_GOAL_LABELS: Record<string, { emoji: string; label: string }> = {
  cut:           { emoji: "🔥", label: "Cutting" },
  bulk:          { emoji: "💪", label: "Bulking" },
  recomposition: { emoji: "⚖️", label: "Recomp" },
};

const PHASE_COLORS: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

export default function AIRecommendationCard({ phaseData, goals = [], bodyGoal, cycleDay = 1 }: Props) {
  const [expanded, setExpanded] = useState(false);

  const phase   = phaseData.phase;
  const color   = PHASE_COLORS[phase] ?? "#C48A97";
  const msgs    = phaseMessages[phase] ?? phaseMessages.menstrual;
  const start   = PHASE_STARTS[phase] ?? 1;

  // Pick message based on day within phase — different every day, cycles through
  const dayInPhase = Math.max(0, cycleDay - start);
  const msgIndex   = dayInPhase % msgs.length;
  const todayMsg   = msgs[msgIndex];

  // Personalisation layers
  const bodyGoalTip    = bodyGoal && bodyGoalTips[bodyGoal]?.[phase];
  const goalInsights   = goals.filter(g => goalTips[g]?.[phase]).map(g => ({ goal: g, tip: goalTips[g][phase] }));
  const hasPersonal    = !!(bodyGoalTip || goalInsights.length > 0);
  const bgColor        = `${color}08`;
  const borderColor    = `${color}28`;

  return (
    <div className="rounded-2xl p-4 mb-3"
      style={{ background: bgColor, border: `0.5px solid ${borderColor}`, borderLeft: `3px solid ${color}` }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
          style={{ background: `linear-gradient(135deg, #C48A97, #7B6D8D)` }}>
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
            HerPhase AI
          </p>
          <p className="text-[10px] text-dark/40 font-body">
            {todayMsg.category}
            {hasPersonal && ` · personalised`}
          </p>
        </div>
        {/* Day indicator dots */}
        <div className="flex gap-1 flex-shrink-0">
          {msgs.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === msgIndex ? color : `${color}30` }} />
          ))}
        </div>
      </div>

      {/* Today's message */}
      <p className="text-dark/80 text-sm font-body leading-relaxed mb-2" style={{ minHeight: "5.75rem" }}>
        {todayMsg.text}
      </p>

      {/* Expand for personalised tips */}
      {hasPersonal && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold transition-colors duration-200"
          style={{ color }}>
          {expanded ? "Show less ↑" : "Your goals ↓"}
        </button>
      )}

      {/* Personalised section */}
      {expanded && hasPersonal && (
        <div className="mt-3 pt-3 space-y-2.5" style={{ borderTop: `1px solid ${color}20` }}>
          {bodyGoalTip && bodyGoal && (
            <div className="flex gap-2">
              <span className="text-sm flex-shrink-0">{BODY_GOAL_LABELS[bodyGoal]?.emoji}</span>
              <div>
                <span className="text-xs font-bold text-dark">{BODY_GOAL_LABELS[bodyGoal]?.label}: </span>
                <span className="text-xs text-dark/60 font-body">{bodyGoalTip}</span>
              </div>
            </div>
          )}
          {goalInsights.map(({ goal, tip }) => (
            <div key={goal} className="flex gap-2">
              <span className="text-sm flex-shrink-0">💡</span>
              <div>
                <span className="text-xs font-bold text-dark">{goal}: </span>
                <span className="text-xs text-dark/60 font-body">{tip}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasPersonal && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold transition-colors duration-200"
          style={{ color }}>
          {expanded ? "Show less ↑" : "Read more ↓"}
        </button>
      )}

      {expanded && !hasPersonal && (
        <p className="text-xs text-dark/40 font-body mt-2">
          Set goals in Profile to get personalised tips here. 🎯
        </p>
      )}
    </div>
  );
}
