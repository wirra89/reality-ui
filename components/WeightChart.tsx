"use client";

// components/WeightChart.tsx — thin adapter over PhaseLineChart
// Call sites map WeightLog → { date, weight } before passing in.
import PhaseLineChart from "@/components/PhaseLineChart";
import type { LineSeries, PhaseBand } from "@/lib/chartTypes";

interface Props {
  logs:        { date: string; weight: number }[];
  phaseBands?: PhaseBand[];
  compact?:    boolean;
}

export default function WeightChart({ logs, phaseBands, compact = false }: Props) {
  if (logs.length < 2) return null;

  const series: LineSeries[] = [{
    id:     "weight",
    label:  "Weight",
    color:  "#C48A97",
    points: logs.map(l => ({ date: l.date, value: l.weight })),
  }];

  return (
    <PhaseLineChart
      series={series}
      phaseBands={phaseBands ?? []}
      compact={compact}
      showPoints={false}
    />
  );
}
