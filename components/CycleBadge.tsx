"use client";

// components/CycleBadge.tsx
import { PhaseData } from "@/lib/cycle";

interface Props {
  cycleDay: number;
  phaseData: PhaseData;
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
  dayInPhase: dayInPhaseProp,
  phaseDuration: phaseDurationProp,
}: Props) {
  // Compute defaults if not passed
  const phaseStarts: Record<string, number> = { menstrual: 1, follicular: 6, ovulation: 14, luteal: 17 };
  const phaseDurations: Record<string, number> = { menstrual: 5, follicular: 8, ovulation: 3, luteal: 12 };
  const dayInPhase = dayInPhaseProp ?? (cycleDay - (phaseStarts[phaseData.phase] ?? 1) + 1);
  const phaseDuration = phaseDurationProp ?? (phaseDurations[phaseData.phase] ?? 5);
  const progress = dayInPhase / phaseDuration;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * progress;
  const phaseColor = phaseColors[phaseData.phase];

  return (
    <div
      className="relative rounded-3xl p-5 mb-3 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #2A2330 0%, #3D3248 100%)",
      }}
    >
      {/* Decorative blob */}
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none"
        style={{ background: phaseColor, filter: "blur(32px)" }}
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
              stroke="rgba(255,255,255,0.08)"
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
            <span className="text-white font-display font-semibold text-lg leading-none">
              {cycleDay}
            </span>
            <span className="text-white/50 text-[10px] font-body leading-none mt-0.5">
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

          <h2 className="text-white font-display font-semibold text-lg leading-tight">
            {phaseData.label}
          </h2>

          <p className="text-white/50 text-xs mt-1 font-body">
            Day {dayInPhase} of {phaseDuration} in this phase
          </p>

          {/* Mini phase timeline dots */}
          <div className="flex gap-1 mt-2.5">
            {Array.from({ length: phaseDuration }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{
                  background: i < dayInPhase ? phaseColor : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
