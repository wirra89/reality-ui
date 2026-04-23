"use client";

// components/MacroRing.tsx

type MacroRingProps = {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
};

export default function MacroRing({ consumed, target, size = 68, strokeWidth = 5.5 }: MacroRingProps) {
  const r    = (size - strokeWidth * 2) / 2;
  const cx   = size / 2;
  const cy   = size / 2;
  const circ = 2 * Math.PI * r;
  const pct  = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = circ * (1 - pct);
  const displayPct = Math.round(pct * 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F4B8C6" strokeWidth={strokeWidth} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={pct >= 1 ? "#34D399" : "#E8829A"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-accent text-[13px] font-bold text-dark leading-none">{displayPct}%</span>
        <span className="text-[8px] font-semibold uppercase tracking-wide text-text-dim mt-0.5">done</span>
      </div>
    </div>
  );
}
