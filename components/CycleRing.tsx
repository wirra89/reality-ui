"use client";

// components/CycleRing.tsx
import { PHASE_DOT_COLOR } from "@/lib/phaseColors";

type CycleRingProps = {
  cycleDay: number;
  cycleLength?: number;
  periodLength?: number;
  ovulationLength?: number;
  size?: number;
};

const PHASE_COLORS = PHASE_DOT_COLOR;

export default function CycleRing({
  cycleDay,
  cycleLength = 28,
  periodLength = 5,
  ovulationLength = 3,
  size = 108,
}: CycleRingProps) {
  const r    = 44;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;

  const menstrualEnd  = periodLength;
  const follicularEnd = Math.round(cycleLength * 0.46);
  const ovulationEnd  = follicularEnd + ovulationLength;
  const lutealEnd     = cycleLength;

  const phases = [
    { key: "menstrual",  days: menstrualEnd,                 color: PHASE_COLORS.menstrual,  from: 0 },
    { key: "follicular", days: follicularEnd - menstrualEnd, color: PHASE_COLORS.follicular, from: menstrualEnd },
    { key: "ovulation",  days: ovulationEnd - follicularEnd, color: PHASE_COLORS.ovulation,  from: follicularEnd },
    { key: "luteal",     days: lutealEnd - ovulationEnd,     color: PHASE_COLORS.luteal,     from: ovulationEnd },
  ];

  const todayAngle = ((cycleDay - 1) / cycleLength) * 360 - 90;
  const todayRad   = (todayAngle * Math.PI) / 180;
  const todayX     = cx + r * Math.cos(todayRad);
  const todayY     = cy + r * Math.sin(todayRad);

  let currentPhaseColor = PHASE_COLORS.follicular;
  if (cycleDay <= menstrualEnd)           currentPhaseColor = PHASE_COLORS.menstrual;
  else if (cycleDay <= follicularEnd)     currentPhaseColor = PHASE_COLORS.follicular;
  else if (cycleDay <= ovulationEnd)      currentPhaseColor = PHASE_COLORS.ovulation;
  else                                    currentPhaseColor = PHASE_COLORS.luteal;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F5DEE2" strokeWidth="10" />
        {/* phase arcs */}
        {phases.map(p => {
          const arcLen    = (p.days / cycleLength) * circ;
          const offsetLen = (p.from / cycleLength) * circ;
          return (
            <circle
              key={p.key}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(arcLen - 2, 1)} ${circ - Math.max(arcLen - 2, 1)}`}
              strokeDashoffset={-offsetLen}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        {/* today dot */}
        <circle
          cx={todayX} cy={todayY} r="4"
          fill="white"
          stroke={currentPhaseColor}
          strokeWidth="2"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-accent text-2xl font-bold text-dark leading-none tracking-tight">{cycleDay}</span>
        <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-text-dim mt-0.5">of {cycleLength}</span>
      </div>
    </div>
  );
}
