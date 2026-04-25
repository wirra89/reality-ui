"use client";

// components/RecipePreviewModal.tsx
// Full-screen recipe preview overlay. Called by UnifiedMealSection.
// Logging happens exclusively here — cards themselves have no log button.

import { useState } from "react";

export interface RecipePreviewData {
  id: string;
  name: string;
  phaseReason?: string;
  ingredients: string[];
  steps: string[];
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  prepMin?: number;
  difficulty?: string;
  tags?: string[];
}

interface Props {
  recipe: RecipePreviewData;
  phaseColor: string;
  onClose: () => void;
  onLog: () => Promise<void>;
}

export default function RecipePreviewModal({ recipe, phaseColor, onClose, onLog }: Props) {
  const [logging, setLogging] = useState(false);
  const [logged,  setLogged]  = useState(false);

  async function handleLog() {
    if (logged || logging) return;
    setLogging(true);
    try {
      await onLog();
      setLogged(true);
    } finally {
      setLogging(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-5 pb-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90"
          style={{ background: "var(--color-surface)" }}
        >
          ←
        </button>
        <h2 className="font-display font-semibold text-base text-dark leading-snug text-center flex-1 mx-3 truncate">
          {recipe.name}
        </h2>
        <div className="w-9" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Phase reason */}
        {recipe.phaseReason && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: `${phaseColor}12`, border: `1px solid ${phaseColor}30` }}
          >
            <p className="text-xs font-body leading-relaxed" style={{ color: phaseColor }}>
              {recipe.phaseReason}
            </p>
          </div>
        )}

        {/* Macros strip */}
        <div
          className="rounded-2xl px-3 py-3 grid grid-cols-4"
          style={{ background: "var(--color-surface)" }}
        >
          {[
            { label: "kcal",    value: `${recipe.kcal}`     },
            { label: "protein", value: `${recipe.protein}g` },
            { label: "carbs",   value: `${recipe.carbs}g`   },
            { label: "fat",     value: `${recipe.fats}g`    },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-dark font-semibold text-sm">{m.value}</p>
              <p className="text-xs text-[var(--color-text-dim)] mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Meta */}
        {(recipe.prepMin || recipe.difficulty) && (
          <div className="flex gap-3">
            {recipe.prepMin && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "var(--color-surface)", color: "var(--color-text-mid)" }}
              >
                ⏱ {recipe.prepMin} min
              </span>
            )}
            {recipe.difficulty && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "var(--color-surface)", color: "var(--color-text-mid)" }}
              >
                {recipe.difficulty}
              </span>
            )}
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: `${phaseColor}99` }}
            >
              Ingredients
            </p>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-body text-[var(--color-text-mid)]">
                  <span className="mt-1 flex-shrink-0 text-xs" style={{ color: phaseColor }}>•</span>
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: `${phaseColor}99` }}
            >
              Preparation
            </p>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-body text-[var(--color-text-mid)]">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none"
                    style={{ background: `${phaseColor}22`, color: phaseColor }}
                  >
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Spacer so button doesn't cover last step */}
        <div className="h-20" />
      </div>

      {/* Sticky log button */}
      <div
        className="flex-shrink-0 px-4 pb-6 pt-3"
        style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}
      >
        <button
          onClick={handleLog}
          disabled={logging || logged}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          style={{
            background: logged
              ? "rgba(0,0,0,0.08)"
              : `linear-gradient(135deg, ${phaseColor}, ${phaseColor}88)`,
            color: logged ? "var(--color-text-dim)" : "white",
          }}
        >
          {logging ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Logging…</span></>
          ) : logged ? (
            "✓ Logged"
          ) : (
            "Log this meal"
          )}
        </button>
      </div>
    </div>
  );
}
