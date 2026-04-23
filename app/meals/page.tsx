"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/meals/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import { type Phase } from "@/lib/cycle";
import MealPhaseBanner           from "@/components/MealPhaseBanner";
import NutritionFoodSearch       from "@/components/NutritionFoodSearch";
import NutritionEntryList        from "@/components/NutritionEntryList";
import MealRecommendationCards   from "@/components/MealRecommendationCards";
import PhaseCard from "@/components/PhaseCard";
import MacroRing from "@/components/MacroRing";
import {
  getTodayMealEntries,
  getTodayNutritionSummary,
  getFoodsForPhase,
  type Food,
  type MealLogEntry,
  type NutritionSummary,
} from "@/lib/nutrition";
import { type MacroTargets } from "@/components/NutritionEntryList";
import { type MacroRemaining } from "@/lib/macroMatcher";

export default function MealsPage() {
  const { user, profile, cycleDay, cycleParams, loading, todayState, latestMoodLog } = useApp();
  const router = useRouter();
  const phaseData = getPhaseData(cycleDay, cycleParams);
  const phase = phaseData.phase as Phase;

  // Macro targets: profile calculated values or phase-based fallback
  const macroTargets: MacroTargets = {
    calories: profile?.calculated_calories
      ?? Math.round(phaseData.macros.protein * 4 + phaseData.macros.carbs * 4 + phaseData.macros.fats * 9),
    protein:  profile?.calculated_protein  ?? phaseData.macros.protein,
    carbs:    profile?.calculated_carbs    ?? phaseData.macros.carbs,
    fats:     profile?.calculated_fats     ?? phaseData.macros.fats,
  };

  const [toast, setToast]                             = useState<string | null>(null);
  const [showNutritionSearch, setShowNutritionSearch] = useState(false);
  const [nutritionEntries, setNutritionEntries]       = useState<MealLogEntry[]>([]);
  const [nutritionSummary, setNutritionSummary]       = useState<NutritionSummary | null>(null);
  const [nutritionLoading, setNutritionLoading]       = useState(true);
  const [phaseFoods, setPhaseFoods]                   = useState<Food[]>([]);

  // Remaining macros — clamped to 0, recomputed whenever nutritionSummary updates
  const macroRemaining: MacroRemaining = {
    protein: Math.max(0, macroTargets.protein  - Math.round(nutritionSummary?.protein ?? 0)),
    carbs:   Math.max(0, macroTargets.carbs    - Math.round(nutritionSummary?.carbs   ?? 0)),
    fats:    Math.max(0, macroTargets.fats     - Math.round(nutritionSummary?.fats    ?? 0)),
    kcal:    Math.max(0, macroTargets.calories - Math.round(nutritionSummary?.kcal    ?? 0)),
  };

  // Use today's date as load guard — meal_logs rows are keyed by (user_id, date)
  const today = new Date().toISOString().split("T")[0];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    getFoodsForPhase(phase).then(all => {
      const meals = all.filter(f => f.category === "meal");
      setPhaseFoods(meals.length >= 4 ? meals : all);
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshNutrition() {
    const [entries, summary] = await Promise.all([
      getTodayMealEntries(),
      getTodayNutritionSummary(),
    ]);
    setNutritionEntries(entries);
    setNutritionSummary(summary);
    setNutritionLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    setNutritionLoading(true);
    refreshNutrition();
  }, [user, today]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all"
          style={{ background: "linear-gradient(135deg, #34D399, #10B981)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Nutrition</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Meals & Food</h1>
          </div>
        </header>

        {/* Phase card (design v3) */}
        <PhaseCard
          phase={phase}
          label={phaseData.label}
          description={phaseData.nutritionDetail?.split(".")[0] ?? "Phase nutrition guidance"}
          cycleDay={cycleDay}
          className="mb-3"
        />

        {/* Macro summary card (design v3) */}
        <div className="rounded-[22px] p-4 mb-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-soft)" }}>
          {/* Top row: kcal + ring */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-accent text-[26px] font-bold text-dark leading-none tracking-tight">
                {Math.round(nutritionSummary?.kcal ?? 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-text-dim mt-0.5">Calories eaten</p>
              <p className="text-xs font-semibold text-primary mt-0.5">
                {Math.max(0, macroTargets.calories - Math.round(nutritionSummary?.kcal ?? 0))} kcal remaining
              </p>
            </div>
            <MacroRing
              consumed={Math.round(nutritionSummary?.kcal ?? 0)}
              target={macroTargets.calories}
            />
          </div>
          {/* Macro pills */}
          <div className="flex gap-2">
            {[
              { label: "Protein", consumed: Math.round(nutritionSummary?.protein ?? 0), target: macroTargets.protein, fill: "#E8829A" },
              { label: "Carbs",   consumed: Math.round(nutritionSummary?.carbs   ?? 0), target: macroTargets.carbs,   fill: "#F4B8C6" },
              { label: "Fat",     consumed: Math.round(nutritionSummary?.fats    ?? 0), target: macroTargets.fats,    fill: "#C96480" },
            ].map(m => {
              const pct = Math.min(m.consumed / Math.max(m.target, 1), 1);
              return (
                <div key={m.label} className="flex-1 rounded-xl p-2.5 text-center" style={{ background: "var(--color-ghost)" }}>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-text-dim mb-1">{m.label}</p>
                  <p className="font-accent text-xs font-bold text-dark mb-1.5">{m.consumed}g</p>
                  <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "#F4B8C6" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, background: m.fill }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase banner — TodayState mealFocus or rotating fallback */}
        <MealPhaseBanner
          phaseData={phaseData}
          cycleDay={cycleDay}
          mealFocus={todayState?.mealFocus ?? null}
          adaptedFromCheckin={todayState?.adaptedFromCheckin ?? false}
        />

        {/* Search & log food */}
        <div className="mb-3">
          {!showNutritionSearch ? (
            <button
              onClick={() => setShowNutritionSearch(true)}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all duration-300 active:scale-95 mb-3 flex items-center justify-center gap-2 shadow-soft"
              style={{ background: "linear-gradient(135deg, #E8829A, #C96480)" }}>
              <span className="text-base">🔍</span>
              Search & log food
            </button>
          ) : (
            <NutritionFoodSearch
              cycleDay={cycleDay}
              phase={phase}
              onLogged={() => {
                setShowNutritionSearch(false);
                showToast("✓ Food logged");
                refreshNutrition();
              }}
              onCancel={() => setShowNutritionSearch(false)}
            />
          )}

          <NutritionEntryList
            entries={nutritionEntries}
            summary={nutritionSummary}
            loading={nutritionLoading}
            macroTargets={macroTargets}
            macroRemaining={macroRemaining}
            phase={phase}
            phaseFoods={phaseFoods}
            userGoals={profile?.goals ?? []}
            mealFocusHeadline={todayState?.mealFocus?.headline ?? null}
            cycleDay={cycleDay}
            onLogged={() => { showToast("✓ Food logged"); refreshNutrition(); }}
            onEntryDeleted={(deletedId) => {
              setNutritionEntries(prev => prev.filter(e => e.id !== deletedId));
              refreshNutrition();
            }}
          />
        </div>

        {/* Phase-aware meal recommendation cards */}
        <MealRecommendationCards
          phase={phase}
          cycleDay={cycleDay}
          moodLog={latestMoodLog}
          profile={profile}
          foods={phaseFoods}
          loggedMealTypes={new Set(nutritionEntries.map(e => e.mealType))}
          onLogged={() => {
            showToast("✓ Food logged");
            refreshNutrition();
          }}
        />

      </main>
    </div>
  );
}
