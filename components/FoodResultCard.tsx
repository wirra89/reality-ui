"use client";

// components/FoodResultCard.tsx
// Single row in the unified food search results list.

import { useState } from "react";
import type { UnifiedFood } from "@/lib/foodSearch";
import { calcMacros } from "@/lib/foodSearch";

// ── Source badge config ───────────────────────────────────────────────────────

const SOURCE: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  branded: { label: "Branded",  bg: "rgba(59,130,246,0.12)",  color: "#3B82F6", icon: "🏷️" },
  generic: { label: "Generic",  bg: "rgba(16,185,129,0.12)",  color: "#10B981", icon: "🌿" },
  recipe:  { label: "Recipe",   bg: "rgba(201,100,128,0.12)", color: "#C96480", icon: "✨" },
  custom:  { label: "My Food",  bg: "rgba(168,85,247,0.12)",  color: "#9333EA", icon: "⭐" },
  recent:  { label: "Recent",   bg: "rgba(245,158,11,0.12)",  color: "#D97706", icon: "🕐" },
};

const CONF: Record<string, { dot: string; text: string }> = {
  high:   { dot: "#10B981", text: "Verified"  },
  medium: { dot: "#D97706", text: "Estimated" },
  low:    { dot: "#9CA3AF", text: "Partial"   },
};

interface Props {
  food:        UnifiedFood;
  phaseColor:  string;
  isFavorite:  boolean;
  onSelect:    (food: UnifiedFood) => void;
  onToggleFav: (food: UnifiedFood) => Promise<void>;
}

export default function FoodResultCard({ food, phaseColor, isFavorite, onSelect, onToggleFav }: Props) {
  const [favPending, setFavPending] = useState(false);

  const src  = SOURCE[food.source] ?? SOURCE.generic;
  const conf = CONF[food.confidence];

  // Macros shown for the default serving
  const macros = calcMacros(food, food.servingSizeG);

  async function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    setFavPending(true);
    await onToggleFav(food);
    setFavPending(false);
  }

  return (
    <button
      onClick={() => onSelect(food)}
      className="w-full text-left px-4 py-3 active:bg-ghost transition-colors border-b border-[var(--color-border)] last:border-0"
    >
      <div className="flex items-start gap-2.5">

        {/* Left column */}
        <div className="flex-1 min-w-0">

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex-shrink-0"
              style={{ background: src.bg, color: src.color }}
            >
              {src.icon} {src.label}
            </span>
            {food.confidence !== "high" && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold flex-shrink-0"
                style={{ color: conf.dot }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                  style={{ background: conf.dot }} />
                {conf.text}
              </span>
            )}
          </div>

          {/* Name */}
          <p className="text-[13px] font-semibold text-dark leading-snug truncate">{food.name}</p>

          {/* Brand / source label */}
          {food.brand && food.brand !== "HerPhase Recipe" && (
            <p className="text-[11px] text-dark/40 font-body truncate mt-0.5">{food.brand}</p>
          )}

          {/* Phase hint */}
          {food.phaseHint && (
            <p className="text-[10px] font-semibold mt-0.5 leading-snug"
              style={{ color: phaseColor }}>
              {food.phaseHint}
            </p>
          )}
        </div>

        {/* Right column — macros + fav */}
        <div className="flex items-start gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-[13px] font-bold text-dark">{macros.kcal} kcal</p>
            <p className="text-[10px] text-dark/40 font-body whitespace-nowrap">
              P {macros.protein}g · C {macros.carbs}g · F {macros.fats}g
            </p>
            <p className="text-[9px] text-dark/25 font-body mt-0.5">{food.servingLabel}</p>
          </div>

          {/* Favourite heart */}
          <button
            onClick={handleFav}
            disabled={favPending}
            aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0 mt-0.5"
            style={{ background: isFavorite ? `${phaseColor}18` : "transparent" }}
          >
            <span className="text-[17px] leading-none"
              style={{ color: isFavorite ? phaseColor : "var(--color-text-dim)" }}>
              {isFavorite ? "♥" : "♡"}
            </span>
          </button>
        </div>

      </div>
    </button>
  );
}
