"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/meals/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import { type Phase } from "@/lib/cycle";
import NutritionFoodSearch       from "@/components/NutritionFoodSearch";
import NutritionEntryList        from "@/components/NutritionEntryList";
import UnifiedMealSection        from "@/components/UnifiedMealSection";
import PhaseCard from "@/components/PhaseCard";
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
  const { user, profile, cycleDay, cycleParams, loading, todayState, latestMoodLog, dailySignals } = useApp();
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

  const ironBoost = (latestMoodLog?.flow_intensity === "medium" || latestMoodLog?.flow_intensity === "heavy") && phase === "menstrual";

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


        {/* Search & log food */}
        <div className="mb-3">
          {!showNutritionSearch ? (
            <button
              onClick={() => setShowNutritionSearch(true)}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all duration-300 active:scale-95 mb-3 flex items-center justify-center gap-2 shadow-soft"
              style={{ background: "linear-gradient(135deg, #C96480, #A84468)" }}>
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

        {/* Unified phase-aware meal recommendations */}
        <UnifiedMealSection
          phase={phase}
          dailySignals={dailySignals}
          macroTargets={macroTargets}
          cycleDay={cycleDay}
          phaseFoods={phaseFoods}
          ironBoost={ironBoost}
          onLogged={() => {
            showToast("✓ Meal logged");
            refreshNutrition();
          }}
        />

      </main>
    </div>
  );
}
