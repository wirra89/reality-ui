"use client";

// components/PhaseLineChart.tsx — shared SVG chart engine
// Pure props-in / SVG-out. No DB access, no context reads.

import { useMemo } from "react";
import type { LineSeries, PhaseBand } from "@/lib/chartTypes";
import type { Phase } from "@/lib/cycle";

const PHASE_DOT_COLORS: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

interface Props {
  series:          LineSeries[];
  phaseBands:      PhaseBand[];       // pass [] to suppress bands
  windowDays?:     number;            // default 60 — clips to last N days before scaling
  yMin?:           number;            // explicit y-axis floor (auto-derived if omitted)
  yMax?:           number;            // explicit y-axis ceiling (auto-derived if omitted)
  height?:         number;            // SVG height in px, default 140
  compact?:        boolean;           // reduces bottom padding and label density
  showLegend?:     boolean;           // default: series.length > 1
  showPoints?:     boolean;           // default false — renders a dot per data point
  pointColorMode?: "series" | "phase"; // default "series"
}

export default function PhaseLineChart({
  series,
  phaseBands,
  windowDays     = 60,
  yMin: yMinProp,
  yMax: yMaxProp,
  height         = 140,
  compact        = false,
  showLegend,
  showPoints     = false,
  pointColorMode = "series",
}: Props) {
  const CHART_W       = 340;
  const PAD_TOP       = 10;
  const PAD_RIGHT     = 12;
  const PAD_BOTTOM    = compact ? 18 : 24;
  const PAD_LEFT      = 34;
  const INNER_W       = CHART_W - PAD_LEFT - PAD_RIGHT;
  const INNER_H       = height  - PAD_TOP  - PAD_BOTTOM;

  // ── Window filter ─────────────────────────────────────────────────────────
  const cutoffTs = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - windowDays);
    return d.getTime();
  }, [windowDays]);

  const windowed = useMemo(() =>
    series.map(s => ({
      ...s,
      points: s.points.filter(p => {
        const ts = new Date(p.date).getTime();
        return !isNaN(ts) && ts >= cutoffTs;
      }),
    })),
  [series, cutoffTs]);

  const allPoints = useMemo(() => windowed.flatMap(s => s.points), [windowed]);

  // Need at least 2 points across all series to render anything meaningful
  if (allPoints.length < 2) return null;

  // ── Scales ────────────────────────────────────────────────────────────────
  const dateTs  = allPoints.map(p => new Date(p.date).getTime());
  const dateMin = Math.min(...dateTs);
  const dateMax = Math.max(...dateTs);
  const dateRange = dateMax - dateMin || 1;

  const values  = allPoints.map(p => p.value);
  const autoMin = Math.min(...values);
  const autoMax = Math.max(...values);
  const yPad    = (autoMax - autoMin) * 0.1 || 1;
  const yMin    = yMinProp ?? autoMin - yPad;
  const yMax    = yMaxProp ?? autoMax + yPad;
  const yRange  = yMax - yMin || 1;

  function toX(dateStr: string): number {
    return PAD_LEFT + ((new Date(dateStr).getTime() - dateMin) / dateRange) * INNER_W;
  }

  function toY(value: number): number {
    return PAD_TOP + (1 - (value - yMin) / yRange) * INNER_H;
  }

  // ── Grid (3 horizontal lines at 25 / 50 / 75 % of y range) ───────────────
  const gridTicks = [0.25, 0.5, 0.75].map(pct => ({
    label: (yMin + pct * yRange).toFixed(1),
    y:     PAD_TOP + (1 - pct) * INNER_H,
  }));

  // ── X-axis date labels ────────────────────────────────────────────────────
  const sorted  = [...allPoints].sort((a, b) => a.date.localeCompare(b.date));
  const firstPt = sorted[0];
  const lastPt  = sorted[sorted.length - 1];
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const shouldShowLegend = showLegend ?? series.length > 1;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${CHART_W} ${height}`}
        className="w-full"
        style={{ height: compact ? Math.min(height, 80) : height }}
      >
        {/* Phase bands — behind everything */}
        {phaseBands.map((band, i) => {
          const x1 = Math.max(PAD_LEFT, toX(band.startDate));
          const x2 = Math.min(CHART_W - PAD_RIGHT, toX(band.endDate));
          if (x2 <= x1) return null;
          return (
            <rect
              key={i}
              x={x1} y={PAD_TOP}
              width={x2 - x1} height={INNER_H}
              fill={band.color}
            />
          );
        })}

        {/* Grid lines */}
        {gridTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} y1={t.y}
              x2={CHART_W - PAD_RIGHT} y2={t.y}
              stroke="#F3F0F7" strokeWidth="1" strokeDasharray="4 3"
            />
            <text
              x={PAD_LEFT - 4} y={t.y + 3.5}
              textAnchor="end" fontSize="8"
              fill="#C4BED0" fontFamily="system-ui"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Series (index 0 rendered first = behind later series) */}
        {windowed.map((s) => {
          if (s.points.length < 1) return null;

          const ptCoords = s.points.map(p => `${toX(p.date)},${toY(p.value)}`);

          // Area fill for single-series charts only
          const firstX  = toX(s.points[0].date);
          const lastX   = toX(s.points[s.points.length - 1].date);
          const bottomY = PAD_TOP + INNER_H;
          const area = windowed.filter(x => x.points.length > 0).length === 1
            ? `M ${firstX},${bottomY} L ${s.points.map(p => `${toX(p.date)},${toY(p.value)}`).join(" L ")} L ${lastX},${bottomY} Z`
            : null;

          // Dots to render
          const dotPoints = showPoints
            ? s.points
            : s.points.length === 1
              ? [s.points[0]]
              : [s.points[0], s.points[s.points.length - 1]];

          return (
            <g key={s.id}>
              {area && (
                <path d={area} fill={s.color} fillOpacity={0.1} />
              )}
              <polyline
                points={ptCoords.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {dotPoints.map((p, pi) => {
                const dotColor =
                  pointColorMode === "phase" && p.phase
                    ? (PHASE_DOT_COLORS[p.phase] ?? s.color)
                    : s.color;
                return (
                  <circle
                    key={pi}
                    cx={toX(p.date)} cy={toY(p.value)}
                    r="3.5"
                    fill="var(--color-surface)"
                    stroke={dotColor}
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          );
        })}

        {/* X-axis labels */}
        <text
          x={PAD_LEFT} y={height - 2}
          fontSize="8" fill="#C4BED0" fontFamily="system-ui"
        >
          {fmtDate(firstPt.date)}
        </text>
        <text
          x={CHART_W - PAD_RIGHT} y={height - 2}
          fontSize="8" fill="#C4BED0" fontFamily="system-ui" textAnchor="end"
        >
          {fmtDate(lastPt.date)}
        </text>
      </svg>

      {/* Legend — rendered outside SVG so it uses HTML text */}
      {shouldShowLegend && (
        <div className="flex flex-wrap gap-3 mt-1.5 px-1">
          {series.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full"
                style={{ width: 12, height: 2, background: s.color }}
              />
              <span className="text-xs text-dark/50 font-body">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
