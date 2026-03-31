"use client";

// components/WeightChart.tsx — reusable SVG weight chart
import { type WeightLog } from "@/lib/supabase";

interface Props {
  logs: WeightLog[];
  compact?: boolean; // smaller version for History tab
}

export default function WeightChart({ logs, compact = false }: Props) {
  if (logs.length < 2) return null;

  const chartW = 340;
  const chartH = compact ? 80 : 120;
  const padding = { top: 10, right: 12, bottom: compact ? 18 : 24, left: 34 };

  const weights = logs.map(l => l.weight_kg);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = maxW - minW || 1;
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;
  const bottomY = padding.top + innerH;

  const points = logs.map((log, i) => {
    const x = padding.left + (i / (logs.length - 1)) * innerW;
    const y = padding.top + (1 - (log.weight_kg - minW) / rangeW) * innerH;
    return { x, y, log };
  });

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `M ${padding.left},${bottomY} L ${points.map(p => `${p.x},${p.y}`).join(" L ")} L ${chartW - padding.right},${bottomY} Z`;

  const ticks = [minW + 1, (minW + maxW) / 2, maxW - 1].map(v => ({
    val: v.toFixed(1),
    y: padding.top + (1 - (v - minW) / rangeW) * innerH,
  }));

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  const first = logs[0];
  const last  = logs[logs.length - 1];

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ height: compact ? 80 : 120 }}>

        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padding.left} y1={t.y} x2={chartW - padding.right} y2={t.y}
              stroke="#F3F0F7" strokeWidth="1" strokeDasharray="4 3" />
            <text x={padding.left - 4} y={t.y + 3.5} textAnchor="end"
              fontSize="8" fill="#C4BED0" fontFamily="system-ui">{t.val}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={area} fill="rgba(196,138,151,0.08)" />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#C48A97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots — first, last, and any notable points */}
        {points.filter((_, i) => i === 0 || i === points.length - 1).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#C48A97" strokeWidth="2" />
        ))}

        {/* X axis labels */}
        <text x={padding.left} y={chartH - 2} fontSize="8" fill="#C4BED0" fontFamily="system-ui">{fmt(first.date)}</text>
        <text x={chartW - padding.right} y={chartH - 2} fontSize="8" fill="#C4BED0" fontFamily="system-ui" textAnchor="end">{fmt(last.date)}</text>
      </svg>
    </div>
  );
}
