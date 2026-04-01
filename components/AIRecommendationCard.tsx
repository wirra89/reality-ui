"use client";

// components/AIRecommendationCard.tsx
// Refactored in Step 3 — insight title + body now come from TodayState.
// Goal-specific personalisation layer is preserved (it's not duplicated in TodayState).

import { useState } from "react";
import type { Phase } from "@/lib/cycle";

interface Props {
  // From TodayState (Step 3 wiring)
  insightTitle: string;
  insightBody: string;
  adaptedFromCheckin: boolean;
  phase: Phase;
  // Goal personalisation — kept from original, still useful
  goals?: string[];
  bodyGoal?: string | null;
}

const PHASE_COLORS: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// Goal + body goal tips remain in component — they are not in TodayState
// and add a useful personalisation layer on top of the engine insight.
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

export default function AIRecommendationCard({
  insightTitle,
  insightBody,
  adaptedFromCheckin,
  phase,
  goals = [],
  bodyGoal,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const color        = PHASE_COLORS[phase] ?? "#C48A97";
  const bgColor      = `${color}08`;
  const borderColor  = `${color}28`;

  const bodyGoalTip  = bodyGoal && bodyGoalTips[bodyGoal]?.[phase];
  const goalInsights = goals
    .filter(g => goalTips[g]?.[phase])
    .map(g => ({ goal: g, tip: goalTips[g][phase] }));
  const hasPersonal  = !!(bodyGoalTip || goalInsights.length > 0);

  return (
    <div className="rounded-2xl p-4 mb-3"
      style={{ background: bgColor, border: `0.5px solid ${borderColor}`, borderLeft: `3px solid ${color}` }}>

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
            HerPhase Insight
          </p>
          <p className="text-xs text-dark/40 font-body">
            {adaptedFromCheckin ? "Personalised to your check-in" : "Phase-based guidance"}
            {hasPersonal && " · + your goals"}
          </p>
        </div>
      </div>

      {/* Insight title from TodayState */}
      <p className="text-sm font-semibold text-dark mb-2">
        {insightTitle}
      </p>

      {/* Insight body from TodayState */}
      <p className="text-dark/70 text-sm font-body leading-relaxed mb-2">
        {insightBody}
      </p>

      {/* Goal personalisation layer — unchanged from original */}
      {hasPersonal && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold transition-colors duration-200"
          style={{ color }}>
          {expanded ? "Show less ↑" : "Your goals ↓"}
        </button>
      )}

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
