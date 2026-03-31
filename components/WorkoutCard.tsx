"use client";

// components/WorkoutCard.tsx
import { PhaseData } from "@/lib/cycle";

interface Props {
  phaseData: PhaseData;
}

const energyLabels: Record<string, string> = {
  low: "Low Energy",
  moderate: "Moderate Energy",
  high: "High Energy",
  peak: "Peak Energy",
};

const energyWidths: Record<string, string> = {
  low: "30%",
  moderate: "60%",
  high: "82%",
  peak: "100%",
};

const phaseIcons: Record<string, string> = {
  menstrual: "🧘‍♀️",
  follicular: "🏋️‍♀️",
  ovulation: "⚡",
  luteal: "🚴‍♀️",
};

export default function WorkoutCard({ phaseData }: Props) {
  const icon = phaseIcons[phaseData.phase];

  return (
    <div
      className="relative rounded-3xl p-5 mb-3 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #2A2330 0%, #3D3248 100%)",
      }}
    >
      {/* Accent blob */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, #C48A97 0%, transparent 65%)",
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/50 text-xs font-body uppercase tracking-widest mb-1">
            Today's Training
          </p>
          <h2 className="text-white font-display font-semibold text-xl leading-tight">
            {phaseData.training}
          </h2>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>

      {/* Description */}
      <p className="text-white/60 text-sm font-body leading-relaxed mb-5">
        {phaseData.trainingDetail}
      </p>

      {/* Energy level bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white/50 text-xs font-body">Energy level</span>
          <span className="text-white/80 text-xs font-semibold">
            {energyLabels[phaseData.energyLevel]}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: energyWidths[phaseData.energyLevel],
              background: "linear-gradient(90deg, #C48A97, #EDD5DB)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
