"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/meals/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import { saveMealLog, getTodayMealLog, type MealEntry } from "@/lib/supabase";
import { type Phase } from "@/lib/foods";
import MealPhaseBanner    from "@/components/MealPhaseBanner";
import MealDailySummary   from "@/components/MealDailySummary";
import MealLogForm        from "@/components/MealLogForm";
import MealFoodLibrary    from "@/components/MealFoodLibrary";
// V1.1 nutrition components — coexist with legacy system during transition
import NutritionFoodSearch      from "@/components/NutritionFoodSearch";
import NutritionEntryList       from "@/components/NutritionEntryList";
import MealRecommendationCards  from "@/components/MealRecommendationCards";
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

// Set to true to re-enable legacy meal UI (MealDailySummary, MealFoodLibrary, Log Custom Meal button).
// Legacy code is preserved intact — this flag only controls visibility.
const SHOW_LEGACY_MEALS = false;

export default function MealsPage() {
  const { user, profile, cycleDay, cycleParams, loading, todayState } = useApp();
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

  const [meals, setMeals]             = useState<MealEntry[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [dataLoading, setDataLoading] = useState(true);
  const [toast, setToast]             = useState<string | null>(null);

  // ── V1.1 nutrition state — new relational system, coexists with legacy ──
  const [showNutritionSearch, setShowNutritionSearch] = useState(false);
  const [nutritionEntries, setNutritionEntries]       = useState<MealLogEntry[]>([]);
  const [nutritionSummary, setNutritionSummary]       = useState<NutritionSummary | null>(null);
  const [nutritionLoading, setNutritionLoading]       = useState(true);

  // Remaining macros — clamped to 0, recomputed whenever nutritionSummary updates
  const macroRemaining: MacroRemaining = {
    protein: Math.max(0, macroTargets.protein  - Math.round(nutritionSummary?.protein ?? 0)),
    carbs:   Math.max(0, macroTargets.carbs    - Math.round(nutritionSummary?.carbs   ?? 0)),
    fats:    Math.max(0, macroTargets.fats     - Math.round(nutritionSummary?.fats    ?? 0)),
    kcal:    Math.max(0, macroTargets.calories - Math.round(nutritionSummary?.kcal    ?? 0)),
  };

  // ── Phase food pool — lifted here so both NutritionEntryList and
  //    MealRecommendationCards share the same loaded data ──
  const [phaseFoods, setPhaseFoods] = useState<Food[]>([]);

  useEffect(() => {
    getFoodsForPhase(phase).then(all => {
      const meals = all.filter(f => f.category === "meal");
      setPhaseFoods(meals.length >= 4 ? meals : all);
    });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use today's date as the load guard — not cycleDay.
  // meal_logs rows are keyed by (user_id, date), so re-fetching on the same day
  // is safe and correct. Previously used cycleDay which caused stale data from
  // previous cycles with the same cycle_day number to be loaded.
  const today = new Date().toISOString().split("T")[0];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    setMeals([]);
    getTodayMealLog().then((log) => {
      if (log?.meals) setMeals(log.meals as MealEntry[]);
      setDataLoading(false);
    });
  }, [user, today]); // re-fetch if date changes (midnight rollover)

  // ── V1.1: load nutrition entries + summary from new relational table ──
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

  async function persistMeals(updated: MealEntry[]) {
    setSaveStatus("loading");
    const result = await saveMealLog({ cycle_day: cycleDay, phase, meals: updated });
    setSaveStatus(result.success ? "success" : "error");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }

  function handleAdd(entry: MealEntry) {
    const updated = [...meals, entry];
    setMeals(updated);
    persistMeals(updated);
    setShowForm(false);
    showToast(`✓ ${entry.name} added`);
  }

  function handleRemove(idx: number) {
    const updated = meals.filter((_, i) => i !== idx);
    setMeals(updated);
    persistMeals(updated);
  }

  function handleAddFromLibrary(entry: MealEntry) {
    const updated = [...meals, entry];
    setMeals(updated);
    persistMeals(updated);
    showToast(`✓ ${entry.name} added`);
  }

  if (loading || !user) return (
    <PageSkeleton />
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

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
          <div className="flex items-center gap-2">
            {saveStatus === "success" && <span className="text-xs text-emerald-500 font-semibold">✓ Saved</span>}
            {saveStatus === "error"   && <span className="text-xs text-rose-500 font-semibold">✗ Error</span>}
          </div>
        </header>

        {/* Phase banner — TodayState mealFocus or rotating fallback */}
        <MealPhaseBanner
          phaseData={phaseData}
          cycleDay={cycleDay}
          mealFocus={todayState?.mealFocus ?? null}
          adaptedFromCheckin={todayState?.adaptedFromCheckin ?? false}
        />

        {/* Daily summary + logged meals — legacy system, hidden from testers */}
        {SHOW_LEGACY_MEALS && (
          <MealDailySummary
            meals={meals}
            phaseData={phaseData}
            profile={profile}
            onRemove={handleRemove}
            dataLoading={dataLoading}
            logButton={
              showForm ? (
                <MealLogForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
              ) : (
                <button onClick={() => setShowForm(true)}
                  className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all duration-300 active:scale-95 shadow-soft mb-4 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                  <span className="text-base">✏️</span>
                  Log Custom Meal
                </button>
              )
            }
          />
        )}

        {/* ── V1.1: Search & log food — above recommendations ── */}
        <div className="mb-3">
          {!showNutritionSearch ? (
            <button
              onClick={() => setShowNutritionSearch(true)}
              className="w-full py-3.5 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all duration-300 active:scale-95 mb-3 flex items-center justify-center gap-2 shadow-soft"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
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

        {/* ── V1.1: Phase-aware meal recommendation cards — below logged entries ── */}
        <MealRecommendationCards
          phase={phase}
          cycleDay={cycleDay}
          foods={phaseFoods}
          onLogged={() => {
            showToast("✓ Food logged");
            refreshNutrition();
          }}
        />

        {/* Food library — phase recommendations, legacy system, hidden from testers */}
        {SHOW_LEGACY_MEALS && <MealFoodLibrary phase={phase} onAddFood={handleAddFromLibrary} />}
      </main>
    </div>
  );
}
