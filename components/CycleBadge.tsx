"use client";

// components/CycleBadge.tsx
import { PhaseData, CycleParams, Phase, getDayInPhase, getPhaseDuration } from "@/lib/cycle";

interface Props {
  cycleDay: number;
  phaseData: PhaseData;
  cycleParams?: CycleParams;
  dayInPhase?: number;
  phaseDuration?: number;
}

const phaseColors: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

export default function CycleBadge({
  cycleDay,
  phaseData,
  cycleParams = {},
  dayInPhase: dayInPhaseProp,
  phaseDuration: phaseDurationProp,
}: Props) {
  const dayInPhase    = dayInPhaseProp    ?? getDayInPhase(cycleDay, cycleParams);
  const phaseDuration = phaseDurationProp ?? getPhaseDuration(phaseData.phase as Phase, cycleParams);
  const progress = dayInPhase / phaseDuration;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;
  const phaseColor = phaseColors[phaseData.phase];

  return (
    <div
      className="relative rounded-3xl p-5 mb-3 overflow-hidden"
      style={{
        background: "var(--color-surface)",
        borderTop: `4px solid ${phaseColor}`,
      }}
    >
      {/* Decorative blob */}
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none"
        style={{ background: phaseColor, filter: "blur(32px)" }}
      />
      {/* Second subtle glow — bottom left */}
      <div
        className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full opacity-10 pointer-events-none"
        style={{ background: phaseColor, filter: "blur(24px)" }}
      />

      <div className="flex items-center gap-5">
        {/* SVG arc progress ring */}
        <div className="relative flex-shrink-0 w-24 h-24">
          <svg
            className="w-24 h-24 -rotate-90"
            viewBox="0 0 96 96"
          >
            {/* Track */}
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              stroke="rgba(0,0,0,0.08)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              stroke={phaseColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl leading-none">{phaseData.emoji}</span>
            <span className="text-dark font-display font-semibold text-lg leading-none">
              {cycleDay}
            </span>
            <span className="text-[var(--color-text-dim)] text-xs font-body leading-none mt-0.5">
              day
            </span>
          </div>
        </div>

        {/* Phase info */}
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2"
            style={{
              background: `${phaseColor}22`,
              color: phaseColor,
              border: `1px solid ${phaseColor}44`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: phaseColor }}
            />
            {phaseData.phase.charAt(0).toUpperCase() + phaseData.phase.slice(1)} phase
          </div>

          <h2 className="text-dark font-display font-semibold text-lg leading-tight">
            {phaseData.label}
          </h2>

          <p className="text-[var(--color-text-dim)] text-xs mt-1 font-body">
            Day {dayInPhase} of {phaseDuration} in this phase
          </p>

          {/* Mini phase timeline dots */}
          <div className="flex gap-1 mt-2.5">
            {Array.from({ length: phaseDuration }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{
                  background: i < dayInPhase ? phaseColor : "var(--color-border)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phase progress bar across full cycle — new */}
      <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
          {[
            { phase: "menstrual",  color: "#F87171", w: 18 },
            { phase: "follicular", color: "#34D399", w: 29 },
            { phase: "ovulation",  color: "#FBBF24", w: 11 },
            { phase: "luteal",     color: "#A78BFA", w: 42 },
          ].map(seg => (
            <div
              key={seg.phase}
              className="rounded-full transition-all duration-300"
              style={{
                width: `${seg.w}%`,
                background: seg.color,
                opacity: seg.phase === phaseData.phase ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {[
            { label: "🌙", phase: "menstrual" },
            { label: "🌱", phase: "follicular" },
            { label: "⚡", phase: "ovulation" },
            { label: "🍂", phase: "luteal" },
          ].map(seg => (
            <span
              key={seg.phase}
              className="text-xs transition-all duration-300"
              style={{ opacity: seg.phase === phaseData.phase ? 1 : 0.35 }}
            >
              {seg.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
