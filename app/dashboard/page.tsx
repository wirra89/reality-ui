"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/dashboard/page.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData, formatPeriodStartDate } from "@/lib/cycle";
import { getCheckinStreak, getRecentWorkouts, getTodayMealLog } from "@/lib/supabase";
import CycleBadge from "@/components/CycleBadge";
import CycleSlider from "@/components/CycleSlider";
import WorkoutCard from "@/components/WorkoutCard";
import AIRecommendationCard from "@/components/AIRecommendationCard";
import ReadinessCard from "@/components/ReadinessCard";
import NutritionCard from "@/components/NutritionCard";
import CycleCalendar from "@/components/CycleCalendar";

// ── MacroCard ──────────────────────────────────────────────────────────────
function MacroCard({ phaseData, profile }: {
  phaseData: ReturnType<typeof getPhaseData>;
  profile: import("@/lib/supabase").Profile | null;
}) {
  const hasCustom = !!(profile?.calculated_calories);
  const macros = {
    protein: profile?.calculated_protein ?? phaseData.macros.protein,
    carbs:   profile?.calculated_carbs   ?? phaseData.macros.carbs,
    fats:    profile?.calculated_fats    ?? phaseData.macros.fats,
  };
  const total = hasCustom && profile?.calculated_calories
    ? profile.calculated_calories
    : macros.protein * 4 + macros.carbs * 4 + macros.fats * 9;
  const proteinPct = Math.round((macros.protein * 4 / total) * 100);
  const carbPct    = Math.round((macros.carbs   * 4 / total) * 100);
  const fatPct     = 100 - proteinPct - carbPct;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark">Daily Macros</h3>
        <div className="flex items-center gap-1.5">
          {hasCustom && <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-full">Custom ✓</span>}
          <span className="text-xs text-secondary font-medium">{total} kcal</span>
        </div>
      </div>
      <div className="flex rounded-full overflow-hidden h-2.5 mb-3 gap-0.5">
        <div style={{ width: `${proteinPct}%`, background: "#7B6D8D" }} className="h-full rounded-l-full transition-all duration-500" />
        <div style={{ width: `${carbPct}%`,    background: "#C48A97" }} className="h-full transition-all duration-500" />
        <div style={{ width: `${fatPct}%`,     background: "#EDD5DB" }} className="h-full rounded-r-full transition-all duration-500" />
      </div>
      <div className="flex justify-between text-xs">
        {[
          { label: "Protein", val: macros.protein, color: "#7B6D8D" },
          { label: "Carbs",   val: macros.carbs,   color: "#C48A97" },
          { label: "Fats",    val: macros.fats,    color: "#EDD5DB" },
        ].map(m => (
          <div key={m.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: m.color }} />
            <span className="text-dark/70">{m.label} <strong className="text-dark">{m.val}g</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DashboardPage ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile, cycleDay, cycleParams, setCycleDay, setPeriodStartToday, setPeriodStartDate, loading, newCyclePrompt, dismissNewCyclePrompt, todayState } = useApp();
  const router = useRouter();

  const [showCalendar, setShowCalendar]     = useState(false);
  const [streak, setStreak]                 = useState(0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [todayCalories, setTodayCalories]   = useState(0);
  const [waterGlasses, setWaterGlasses]     = useState(0);

  // Water — persists in localStorage per day
  const WATER_KEY = `herphase_water_${new Date().toISOString().split("T")[0]}`;
  function addWater() {
    const next = Math.min(waterGlasses + 1, 12);
    setWaterGlasses(next);
    localStorage.setItem(WATER_KEY, String(next));
  }
  function removeWater() {
    const next = Math.max(waterGlasses - 1, 0);
    setWaterGlasses(next);
    localStorage.setItem(WATER_KEY, String(next));
  }

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    // Load today's water count from localStorage
    const saved = localStorage.getItem(WATER_KEY);
    if (saved) setWaterGlasses(parseInt(saved) || 0);
  }, [WATER_KEY]);

  useEffect(() => {
    if (!user) return;
    getCheckinStreak().then(setStreak);
    getRecentWorkouts(7).then(ws => {
      const ago = new Date(); ago.setDate(ago.getDate() - 7);
      setWeeklyWorkouts(ws.filter(w => w.created_at && new Date(w.created_at) >= ago).length);
    });
    getTodayMealLog().then(log => {
      if (log?.meals) {
        setTodayCalories((log.meals as unknown as { calories: string }[])
          .reduce((a, m) => a + (parseFloat(m.calories) || 0), 0));
      }
    });
  }, [user]);

  const phaseData = getPhaseData(cycleDay, cycleParams);

  if (loading || !user) return (
    <PageSkeleton />
  );

  const firstName   = profile?.name?.split(" ")[0] ?? "Ana";
  const cycleLength = profile?.cycle_length ?? 28;

  // Countdown calculated from cycleDay — updates live with slider
  const daysUntilNext = cycleLength - cycleDay + 1;
  const nextPeriodUrgent = daysUntilNext <= 3;

  // Phase segments for prediction bar
  const segs = [
    { label: "Menstrual",  color: "#F87171", from: 1,                                     end: profile?.period_length ?? 5,         emoji: "🌙" },
    { label: "Follicular", color: "#34D399", from: (profile?.period_length ?? 5) + 1,     end: Math.round(cycleLength * 0.46),      emoji: "🌱" },
    { label: "Ovulation",  color: "#FBBF24", from: Math.round(cycleLength * 0.46) + 1,    end: Math.round(cycleLength * 0.57),      emoji: "⚡" },
    { label: "Luteal",     color: "#A78BFA", from: Math.round(cycleLength * 0.57) + 1,    end: cycleLength,                         emoji: "🍂" },
  ];
  const currentSegIdx   = segs.findIndex(s => s.label.toLowerCase() === phaseData.phase);
  const currentSeg      = segs[currentSegIdx];
  const daysLeftInPhase = currentSeg ? Math.max(0, currentSeg.end - cycleDay) : 0;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-64 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.18) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pb-12 pt-6">

        {/* ── 1. HEADER ── */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#B8788A" }}>Good morning</p>
            <h1 className="font-display text-2xl font-semibold text-dark leading-tight">Hi, {firstName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white shadow-card">
                <span className="text-base">🔥</span>
                <span className="text-xs font-bold text-dark">{streak}</span>
              </div>
            )}
            <button
              className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-semibold shadow-soft"
              style={{ background: profile?.avatar_url ? "transparent" : "linear-gradient(135deg, #C48A97, #7B6D8D)", boxShadow: "0 2px 8px rgba(196,138,151,0.35)" }}
              onClick={() => router.push("/profile")}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : firstName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* ── NEW CYCLE PROMPT ── */}
        {newCyclePrompt && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
            <span className="text-2xl flex-shrink-0">🩸</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark">New cycle starting?</p>
              <p className="text-xs text-dark/50 font-body">It looks like your period may have started. Tap to reset to Day 1.</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button onClick={async () => { await setPeriodStartToday(); }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #F87171, #C48A97)" }}>
                Yes, Day 1
              </button>
              <button onClick={dismissNewCyclePrompt}
                className="text-xs font-medium px-3 py-1 rounded-xl text-dark/40 transition-all active:scale-95"
                style={{ background: "rgba(0,0,0,0.04)" }}>
                Not yet
              </button>
            </div>
          </div>
        )}

        {/* ── 2. PHASE CARD ── */}
        <CycleBadge cycleDay={cycleDay} phaseData={phaseData} />

        {/* ── PERIOD DATE NUDGE — show if not set ── */}
        {!profile?.period_start_date && !newCyclePrompt && (
          <button onClick={() => router.push("/profile")}
            className="w-full rounded-2xl px-4 py-3.5 mb-3 flex items-center gap-3 text-left active:scale-98 transition-all"
            style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
            <span className="text-lg flex-shrink-0">🩸</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">Set your period start date</p>
              <p className="text-xs text-dark/45 font-body">Required for accurate phase tracking and recommendations</p>
            </div>
            <span className="text-dark/25 text-sm">→</span>
          </button>
        )}

        {/* ── PROFILE COMPLETENESS NUDGE — show if goals/metrics missing ── */}
        {profile?.period_start_date && (!profile?.goals?.length || !profile?.height_cm || !profile?.weight_kg) && (
          <button onClick={() => router.push("/profile")}
            className="w-full rounded-2xl px-4 py-3.5 mb-3 flex items-center gap-3 text-left active:scale-98 transition-all"
            style={{ background: "rgba(196,138,151,0.07)", border: "1px solid rgba(196,138,151,0.2)" }}>
            <span className="text-lg flex-shrink-0">✨</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark">Complete your profile</p>
              <p className="text-xs text-dark/45 font-body">Add goals & body stats for personalised macro targets</p>
            </div>
            <span className="text-dark/25 text-sm">→</span>
          </button>
        )}

        {/* ── 3. TODAY'S TRAINING ── */}
        {todayState ? (
          <WorkoutCard recommendation={todayState.workoutRecommendation} phase={phaseData.phase} />
        ) : (
          <WorkoutCard
            recommendation={{
              type: phaseData.training,
              intensity: phaseData.energyLevel === "peak" ? "peak" : phaseData.energyLevel === "high" ? "high" : phaseData.energyLevel === "low" ? "light" : "moderate",
              duration: 45,
              reasoning: phaseData.trainingDetail,
              exercises: [],
            }}
            phase={phaseData.phase}
          />
        )}

        {/* ── 4. HERPHASE INSIGHT ── */}
        <AIRecommendationCard
          insightTitle={todayState?.insightTitle ?? phaseData.label}
          insightBody={todayState?.insightBody ?? phaseData.aiRecommendation}
          adaptedFromCheckin={todayState?.adaptedFromCheckin ?? false}
          phase={phaseData.phase}
          goals={profile?.goals ?? []}
          bodyGoal={profile?.body_goal ?? null}
        />

        {/* ── 5. CYCLE DAY + PREDICTION ── */}
        <div className="bg-white rounded-2xl shadow-card mb-3">

          {/* Period date row */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-50">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-dark/40 font-body uppercase tracking-wide">Period started</p>
              <p className="text-sm font-semibold text-dark truncate">
                {profile?.period_start_date
                  ? `${formatPeriodStartDate(profile.period_start_date)} · Day ${cycleDay}`
                  : "Not set yet"}
              </p>
            </div>
            {profile?.period_start_date && (
              <div className="text-center px-2.5 py-1 rounded-xl flex-shrink-0"
                style={{ background: nextPeriodUrgent ? "rgba(248,113,113,0.10)" : "rgba(167,139,250,0.08)" }}>
                <p className="text-xs font-bold" style={{ color: nextPeriodUrgent ? "#F87171" : "#A78BFA" }}>
                  {daysUntilNext <= 0 ? "Today" : daysUntilNext === 1 ? "Tomorrow" : `${daysUntilNext}d`}
                </p>
                <p className="text-xs text-dark/30 leading-tight">next 🩸</p>
              </div>
            )}
            <button onClick={() => setShowCalendar(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
              style={{ background: "#F9FAFB" }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#7B6D8D" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="3" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                <circle cx="8" cy="15" r="1" fill="#7B6D8D" />
                <circle cx="12" cy="15" r="1" fill="#7B6D8D" />
                <circle cx="16" cy="15" r="1" fill="#7B6D8D" />
              </svg>
            </button>
            <button onClick={async () => { await setPeriodStartToday(); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-soft transition-all active:scale-90 flex-shrink-0 text-base"
              style={{ background: "linear-gradient(135deg, #F87171, #C48A97)" }}>
              🩸
            </button>
          </div>

          {/* Unified slider — no overflow clip so thumb is visible */}
          <div className="px-4 py-3 border-b border-gray-50" style={{ overflow: "visible" }}>
            <CycleSlider cycleDay={cycleDay} cycleLength={cycleLength} cycleParams={cycleParams} onChange={setCycleDay} />
          </div>

          {/* Prediction timeline */}
          <div className="px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide">Coming up</p>
              <p className="text-xs text-dark/30 font-body">
                {daysLeftInPhase > 0 ? `${daysLeftInPhase}d left in ${phaseData.phase}` : "Transitioning soon"}
              </p>
            </div>
            {(() => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              let offset = daysLeftInPhase + 1;
              return [1, 2, 3].map(i => {
                const idx      = (currentSegIdx + i) % 4;
                const phase    = segs[idx];
                const duration = phase.end - phase.from + 1;
                const date     = new Date(today);
                date.setDate(today.getDate() + offset);
                const daysTo = offset;
                offset += duration;
                return (
                  <div key={phase.label} className="flex items-center gap-2.5 mb-2 last:mb-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ background: `${phase.color}15` }}>
                      {phase.emoji}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-dark">{phase.label}</p>
                      <p className="text-xs text-dark/40 font-body">
                        {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {duration} days
                      </p>
                    </div>
                    <p className="text-xs font-semibold flex-shrink-0" style={{ color: phase.color }}>
                      {daysTo === 1 ? "tomorrow" : `in ${daysTo}d`}
                    </p>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Calendar modal */}
        {showCalendar && (
          <CycleCalendar
            periodStartDate={profile?.period_start_date ?? null}
            cycleLength={cycleLength}
            cycleParams={cycleParams}
            onSelectDate={async (date) => { await setPeriodStartDate(date); setShowCalendar(false); }}
            onClose={() => setShowCalendar(false)}
          />
        )}

        {/* ── 6. READINESS + NUTRITION ── */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <ReadinessCard
            score={todayState?.readinessScore ?? phaseData.readinessScore}
            label={todayState?.readinessLabel ?? (phaseData.readinessScore >= 80 ? "peak" : phaseData.readinessScore >= 60 ? "good" : phaseData.readinessScore >= 40 ? "moderate" : "rest")}
            adaptedFromCheckin={todayState?.adaptedFromCheckin ?? false}
          />
          <NutritionCard phaseData={phaseData} />
        </div>

        {/* ── 7. MACROS + WEEKLY STATS ── */}
        <MacroCard phaseData={phaseData} profile={profile} />

        {/* Weekly stats — hide if all zero, show encouragement instead */}
        {(weeklyWorkouts > 0 || streak > 0 || todayCalories > 0) ? (
          <div className="mb-3">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2 px-1">This week</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Workouts", value: weeklyWorkouts, sub: "last 7 days", color: "#C48A97", bg: "rgba(196,138,151,0.06)" },
                { label: "Streak",   value: streak > 0 ? `${streak}🔥` : "0", sub: "day check-in", color: streak >= 7 ? "#B45309" : streak >= 3 ? "#059669" : "#9CA3AF", bg: streak >= 7 ? "rgba(251,191,36,0.06)" : streak >= 3 ? "rgba(52,211,153,0.06)" : "rgba(0,0,0,0.02)" },
                { label: "Calories", value: todayCalories > 0 ? todayCalories : "—", sub: "today", color: "#7B6D8D", bg: "rgba(123,109,141,0.06)" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.bg, border: "1px solid rgba(0,0,0,0.04)" }}>
                  <p className="font-display font-bold text-lg text-dark leading-tight" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="text-xs text-dark/30 font-body">{s.sub}</p>
                  <p className="text-xs text-dark/50 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl flex-shrink-0">🌸</span>
              <div>
                <p className="text-sm font-semibold text-dark">Welcome to HerPhase!</p>
                <p className="text-xs text-dark/40 font-body leading-snug">Start logging to unlock your weekly stats and insights.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Log workout", emoji: "🏋️‍♀️", href: "/training" },
                { label: "Log meal",    emoji: "🥗",     href: "/meals" },
                { label: "Log mood",    emoji: "💭",     href: "/mood" },
              ].map(item => (
                <button key={item.href}
                  onClick={() => router.push(item.href)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold text-dark/60 active:scale-95 transition-all"
                  style={{ background: "rgba(196,138,151,0.07)" }}>
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 8. WATER TRACKER ── */}
        {(() => {
          const waterTarget = (phaseData.phase === "menstrual" || phaseData.phase === "luteal") ? 9 : 8;
          const pct = Math.min(waterGlasses / waterTarget, 1);
          const phaseWaterTip: Record<string, string> = {
            menstrual:  "Higher target — water reduces bloating and cramps",
            follicular: "Stay hydrated as energy and metabolism rise",
            ovulation:  "Peak metabolism needs more water for performance",
            luteal:     "Higher target — water reduces PMS water retention",
          };
          return (
            <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide">Water intake 💧</p>
                  <p className="text-xs text-dark/35 font-body mt-0.5">{phaseWaterTip[phaseData.phase]}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-display text-primary">{waterGlasses}</p>
                  <p className="text-xs text-dark/30 font-body">/ {waterTarget} glasses</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full mb-3 overflow-hidden" style={{ background: "rgba(196,138,151,0.12)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct * 100}%`, background: pct >= 1 ? "linear-gradient(90deg,#34D399,#10B981)" : "linear-gradient(90deg,#C48A97,#7B6D8D)" }} />
              </div>
              {/* Glass buttons */}
              <div className="flex items-center justify-between">
                <button onClick={removeWater} disabled={waterGlasses === 0}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-dark/40 disabled:opacity-25 active:scale-90 transition-all text-lg"
                  style={{ background: "#F9FAFB" }}>−</button>
                <div className="flex gap-1.5 flex-wrap justify-center flex-1 px-2">
                  {Array.from({ length: Math.min(waterTarget, 9) }).map((_, i) => (
                    <button key={i} onClick={() => {
                      const next = i + 1;
                      setWaterGlasses(next);
                      localStorage.setItem(WATER_KEY, String(next));
                    }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90"
                      style={{
                        background: i < waterGlasses ? "rgba(196,138,151,0.15)" : "#F9FAFB",
                        border: i < waterGlasses ? "1.5px solid rgba(196,138,151,0.4)" : "1.5px solid transparent",
                      }}>
                      💧
                    </button>
                  ))}
                </div>
                <button onClick={addWater} disabled={waterGlasses >= 12}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white disabled:opacity-25 active:scale-90 transition-all text-lg font-bold"
                  style={{ background: "linear-gradient(135deg,#C48A97,#7B6D8D)" }}>+</button>
              </div>
              {waterGlasses >= waterTarget && (
                <p className="text-center text-xs text-emerald-500 font-semibold mt-2">✓ Daily goal reached!</p>
              )}
            </div>
          );
        })()}

        {/* ── 10. QUICK ACTIONS ── */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button onClick={() => router.push("/weight")}
            className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl bg-white shadow-card active:scale-95 transition-all text-center">
            <span className="text-xl">⚖️</span>
            <div>
              <p className="text-xs font-semibold text-dark">Weight</p>
              <p className="text-xs text-dark/35 font-body">Log</p>
            </div>
          </button>
          <button onClick={() => router.push("/prs")}
            className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl bg-white shadow-card active:scale-95 transition-all text-center">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-xs font-semibold text-dark">My PRs</p>
              <p className="text-xs text-dark/35 font-body">Records</p>
            </div>
          </button>
          <button onClick={() => router.push("/history")}
            className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl bg-white shadow-card active:scale-95 transition-all text-center">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-xs font-semibold text-dark">History</p>
              <p className="text-xs text-dark/35 font-body">All logs</p>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-secondary/50 mt-8 font-body">HerPhase · Cycle-aware fitness</p>
      </main>
    </div>
  );
}
