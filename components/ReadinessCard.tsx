"use client";

// components/ReadinessCard.tsx
import { PhaseData } from "@/lib/cycle";

interface Props {
  phaseData: PhaseData;
  moodScore?: number | null;   // yesterday's mood (1-5)
  energyScore?: number | null; // yesterday's energy (1-5)
}

function scoreColor(score: number): string {
  if (score >= 80) return "#FBBF24";
  if (score >= 60) return "#34D399";
  if (score >= 40) return "#A78BFA";
  return "#F87171";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Peak";
  if (score >= 60) return "Good";
  if (score >= 40) return "Moderate";
  return "Rest";
}

// Blend phase base score with yesterday's mood + energy
function calcReadiness(phaseBase: number, mood: number | null, energy: number | null): number {
  if (!mood && !energy) return phaseBase;
  const moodNorm   = mood   ? ((mood - 1) / 4) * 100 : phaseBase;
  const energyNorm = energy ? ((energy - 1) / 4) * 100 : phaseBase;
  const personal = (moodNorm + energyNorm) / 2;
  // 50% phase base, 50% personal yesterday data
  return Math.round(phaseBase * 0.5 + personal * 0.5);
}

export default function ReadinessCard({ phaseData, moodScore, energyScore }: Props) {
  const score = calcReadiness(phaseData.readinessScore, moodScore ?? null, energyScore ?? null);
  const color = scoreColor(score);
  const label = scoreLabel(score);
  const isPersonalised = moodScore !== null && moodScore !== undefined;

  const radius = 28;
  const circ   = 2 * Math.PI * radius;
  const filled = circ * (score / 100);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex flex-col items-center">
      <p className="text-xs font-semibold text-dark/60 uppercase tracking-wide mb-2">
        Readiness
      </p>

      <div className="relative w-16 h-16 mb-2 animate-pulse-ring">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="5" />
          <circle cx="36" cy="36" r={radius} fill="none"
            stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            style={{ transition: "stroke-dasharray 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-bold text-base text-dark">{score}</span>
        </div>
      </div>

      <span className="text-xs font-semibold px-2 py-0.5 rounded-full mb-1"
        style={{ background: `${color}22`, color }}>
        {label}
      </span>
      {isPersonalised && (
        <span className="text-[9px] text-dark/30 font-body">Based on your mood</span>
      )}
    </div>
  );
}
