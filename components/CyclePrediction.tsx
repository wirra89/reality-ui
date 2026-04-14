"use client";

// components/CyclePrediction.tsx
import { getNextPeriodInfo, getPhase, getPhaseBoundaries, type CycleParams } from "@/lib/cycle";

interface Props {
  periodStartDate: string;
  cycleLength: number;
  periodLength: number;
  cycleDay: number;
  cycleParams?: CycleParams;
}

const PHASE_CONFIG = {
  menstrual:  { color: "#F87171", bg: "rgba(248,113,113,0.10)", label: "Menstrual",  emoji: "🌙" },
  follicular: { color: "#34D399", bg: "rgba(52,211,153,0.10)",  label: "Follicular", emoji: "🌱" },
  ovulation:  { color: "#FBBF24", bg: "rgba(251,191,36,0.10)",  label: "Ovulation",  emoji: "⚡" },
  luteal:     { color: "#A78BFA", bg: "rgba(167,139,250,0.10)", label: "Luteal",     emoji: "🍂" },
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export default function CyclePrediction({ periodStartDate, cycleLength, periodLength, cycleDay, cycleParams = {} }: Props) {
  const { nextPeriodDate, daysUntil } = getNextPeriodInfo(periodStartDate, cycleLength);
  const params = { ...cycleParams, cycleLength, periodLength };
  const currentPhase = getPhase(cycleDay, params);
  const phaseConfig = PHASE_CONFIG[currentPhase];

  const b = getPhaseBoundaries(params);
  const phases = [
    { name: "Menstrual",  start: b.menstrual.start,  end: b.menstrual.end,  color: "#F87171", emoji: "🌙" },
    { name: "Follicular", start: b.follicular.start, end: b.follicular.end, color: "#34D399", emoji: "🌱" },
    { name: "Ovulation",  start: b.ovulation.start,  end: b.ovulation.end,  color: "#FBBF24", emoji: "⚡" },
    { name: "Luteal",     start: b.luteal.start,     end: b.luteal.end,     color: "#A78BFA", emoji: "🍂" },
  ];

  // Next phase
  const nextPhaseIndex = phases.findIndex(p => p.name.toLowerCase() === currentPhase);
  const upcoming = phases.slice(nextPhaseIndex + 1).concat(phases.slice(0, nextPhaseIndex + 1));

  // Calculate actual calendar dates for next phases
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeftInPhase = phases[nextPhaseIndex].end - cycleDay;

  return (
    <div className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide">Cycle Prediction</p>
          <p className="text-base font-display font-semibold text-dark mt-0.5">Your cycle forecast</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-dark/40 font-body">next period</p>
          <p className="text-sm font-bold" style={{ color: daysUntil <= 5 ? "#F87171" : "#7B6D8D" }}>
            {daysUntil === 0 ? "Today 🩸" : daysUntil === 1 ? "Tomorrow 🩸" : `in ${daysUntil} days`}
          </p>
          <p className="text-xs text-dark/30 font-body">{formatDate(nextPeriodDate)}</p>
        </div>
      </div>

      {/* Cycle bar — visual progress through current cycle */}
      <div className="px-4 mb-3">
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {phases.map((phase) => {
            const width = ((phase.end - phase.start + 1) / cycleLength) * 100;
            const isActive = phase.name.toLowerCase() === currentPhase;
            return (
              <div key={phase.name}
                style={{ width: `${width}%`, background: isActive ? phase.color : `${phase.color}40`, transition: "all 0.3s" }}
                className="rounded-sm" />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-xs text-dark/30 font-body">Day 1</p>
          <p className="text-xs font-bold text-dark/50">Day {cycleDay}/{cycleLength}</p>
          <p className="text-xs text-dark/30 font-body">Day {cycleLength}</p>
        </div>
      </div>

      {/* Current phase detail */}
      <div className="mx-4 mb-3 px-3 py-2.5 rounded-2xl flex items-center gap-3"
        style={{ background: phaseConfig.bg }}>
        <span className="text-2xl">{phaseConfig.emoji}</span>
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: phaseConfig.color }}>
            {phaseConfig.label} phase — Day {cycleDay}
          </p>
          <p className="text-xs text-dark/50 font-body">
            {daysLeftInPhase > 0
              ? `${daysLeftInPhase} more day${daysLeftInPhase > 1 ? "s" : ""} in this phase`
              : "Transitioning soon"}
          </p>
        </div>
      </div>

      {/* Upcoming phases timeline */}
      <div className="px-4 pb-4">
        <p className="text-xs font-semibold text-dark/30 uppercase tracking-wide mb-2">Coming up</p>
        <div className="space-y-2">
          {upcoming.slice(0, 3).map((phase, i) => {
            // Calculate days until this phase starts
            let daysToPhase = 0;
            if (i === 0) {
              daysToPhase = daysLeftInPhase + 1;
            } else {
              daysToPhase = daysLeftInPhase + 1;
              for (let j = 0; j < i; j++) {
                daysToPhase += upcoming[j].end - upcoming[j].start + 1;
              }
            }
            const phaseDate = new Date(today);
            phaseDate.setDate(today.getDate() + daysToPhase);
            const phaseDuration = phase.end - phase.start + 1;

            return (
              <div key={phase.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ background: `${phase.color}18` }}>
                  {phase.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-dark">{phase.name}</p>
                  <p className="text-xs text-dark/40 font-body">{phaseDuration} days · {formatDate(phaseDate)}</p>
                </div>
                <p className="text-xs font-semibold text-dark/40">
                  {daysToPhase === 1 ? "tomorrow" : `in ${daysToPhase}d`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
