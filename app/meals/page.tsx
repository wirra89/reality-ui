"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/meals/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import { saveMealLog, getTodayMealLog, type MealEntry } from "@/lib/supabase";
import { type Phase } from "@/lib/foods";
import MealPhaseBanner   from "@/components/MealPhaseBanner";
import MealDailySummary  from "@/components/MealDailySummary";
import MealLogForm       from "@/components/MealLogForm";
import MealFoodLibrary   from "@/components/MealFoodLibrary";

export default function MealsPage() {
  const { user, profile, cycleDay, cycleParams, loading, todayState } = useApp();
  const router = useRouter();
  const phaseData = getPhaseData(cycleDay, cycleParams);
  const phase = phaseData.phase as Phase;

  const [meals, setMeals]             = useState<MealEntry[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [dataLoading, setDataLoading] = useState(true);
  const [lastLoadedDay, setLastLoadedDay] = useState<number | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    if (lastLoadedDay === cycleDay) return;
    setDataLoading(true);
    setMeals([]);
    setLastLoadedDay(cycleDay);
    getTodayMealLog(cycleDay).then((log) => {
      if (log?.meals && log.cycle_day === cycleDay) setMeals(log.meals as MealEntry[]);
      setDataLoading(false);
    });
  }, [user, cycleDay, lastLoadedDay]);

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

        {/* Daily summary + logged meals */}
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

        {/* Food library */}
        <MealFoodLibrary phase={phase} onAddFood={handleAddFromLibrary} />
      </main>
    </div>
  );
}
