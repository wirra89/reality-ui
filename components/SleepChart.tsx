"use client";

// components/SleepChart.tsx
// Sleep hours bars colored by phase, with quality dot overlay.

const PHASE_COLOR: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

export interface SleepEntry {
  date: string;
  phase: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
}

interface Props {
  entries: SleepEntry[];
}

export default function SleepChart({ entries }: Props) {
  const data = entries
    .filter(e => e.sleep_hours != null && e.sleep_hours > 0)
    .slice(-28);

  if (data.length < 3) {
    return (
      <div
        className="rounded-2xl p-4 text-center text-xs font-body text-[var(--color-text-dim)]"
        style={{ background: "var(--color-surface)" }}
      >
        Log sleep in at least 3 check-ins to see your sleep chart.
      </div>
    );
  }

  const MAX_H = 10;
  const CHART_H = 80;
  const BAR_W = Math.max(4, Math.min(16, Math.floor(280 / data.length) - 2));
  const GAP   = 2;
  const totalW = data.length * (BAR_W + GAP);

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${CHART_H + 4}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
        {/* 7h optimal line */}
        <line
          x1={0}
          y1={CHART_H - (7 / MAX_H) * CHART_H}
          x2={totalW}
          y2={CHART_H - (7 / MAX_H) * CHART_H}
          stroke="#34D39944"
          strokeWidth={1}
          strokeDasharray="3,3"
        />

        {data.map((entry, i) => {
          const h     = entry.sleep_hours ?? 0;
          const barH  = Math.max(4, (h / MAX_H) * CHART_H);
          const x     = i * (BAR_W + GAP);
          const y     = CHART_H - barH;
          const color = PHASE_COLOR[entry.phase] ?? "#C48A97";
          const qual  = entry.sleep_quality;
          const dotY  = qual != null ? y + barH - ((qual - 1) / 4) * barH : null;

          return (
            <g key={i}>
              <rect x={x} y={y} width={BAR_W} height={barH} rx={2} fill={color} opacity={0.7} />
              {dotY != null && (
                <circle cx={x + BAR_W / 2} cy={dotY} r={BAR_W > 8 ? 3 : 2} fill="white" opacity={0.85} />
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {Object.entries(PHASE_COLOR).map(([phase, color]) => (
          <span key={phase} className="flex items-center gap-1 text-[10px] text-[var(--color-text-dim)]">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ background: color, opacity: 0.7 }} />
            {phase.charAt(0).toUpperCase() + phase.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-dim)]">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "white", border: "1px solid #ccc" }} />
          Quality
        </span>
      </div>
    </div>
  );
}
