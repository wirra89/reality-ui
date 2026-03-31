"use client";

// components/NutritionCard.tsx
import { PhaseData } from "@/lib/cycle";

interface Props {
  phaseData: PhaseData;
}

// Specific food tips per phase — what to eat, not macro numbers
const phaseFoodTips: Record<string, { foods: string[]; avoid: string }> = {
  menstrual: {
    foods: ["🥩 Red meat", "🥬 Spinach", "🍫 Dark choc", "🐟 Salmon"],
    avoid: "Caffeine & alcohol",
  },
  follicular: {
    foods: ["🥚 Eggs", "🥦 Broccoli", "🫙 Kimchi", "🍓 Berries"],
    avoid: "Processed sugar",
  },
  ovulation: {
    foods: ["🍚 Complex carbs", "🥩 Lean protein", "🥑 Avocado", "💧 Water"],
    avoid: "Heavy meals pre-workout",
  },
  luteal: {
    foods: ["🌰 Almonds", "🍠 Sweet potato", "🦃 Turkey", "🍵 Chamomile"],
    avoid: "Salty & refined carbs",
  },
};

const phaseColors: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

const nutrientIcons: Record<string, string> = {
  menstrual:  "🫐",
  follicular: "🥗",
  ovulation:  "⚡",
  luteal:     "🥑",
};

export default function NutritionCard({ phaseData }: Props) {
  const tips  = phaseFoodTips[phaseData.phase];
  const color = phaseColors[phaseData.phase];
  const icon  = nutrientIcons[phaseData.phase];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex flex-col">
      <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">
        Nutrition
      </p>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-bold text-dark leading-tight">{phaseData.nutrition}</p>
      </div>

      {/* What to eat */}
      <div className="flex flex-col gap-1 mb-3">
        {tips.foods.map((food) => (
          <p key={food} className="text-xs font-body text-dark/70 leading-snug">{food}</p>
        ))}
      </div>

      {/* Avoid */}
      <div className="mt-auto pt-2 border-t border-gray-50">
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
          style={{ color }}>
          Limit
        </p>
        <p className="text-[10px] text-dark/40 font-body">{tips.avoid}</p>
      </div>
    </div>
  );
}
