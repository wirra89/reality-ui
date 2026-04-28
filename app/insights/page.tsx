"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/insights/page.tsx
// Refactored in Step 7 — data maturity awareness added.
// Three stages: generic (<7 logs), early (7-27), personalized (28+).
// All existing analytics computations are preserved unchanged.
// Only copy/messaging and visibility logic is maturity-aware.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { getPRs, type PersonalRecord } from "@/lib/supabase";
import type { Workout, MealLog, MoodLog } from "@/lib/supabase";
import type { DataMaturityStage } from "@/lib/dailyPlan";
import { getPhaseData, getDayInPhase } from "@/lib/cycle";
import PhaseCard from "@/components/PhaseCard";
import CycleRing from "@/components/CycleRing";
import Sparkline from "@/components/Sparkline";
import { PHASE_FULL as PHASE_COLORS } from "@/lib/phaseColors";
import SleepChart from "@/components/SleepChart";
const PHASE_EMOJIS: Record<string, string> = {
  menstrual: "🌙", follicular: "🌱", ovulation: "⚡", luteal: "🍂",
};
const PHASES = ["menstrual", "follicular", "ovulation", "luteal"];

type InsightTab = "overview" | "training" | "meals" | "mood" | "cycles";

// ── Data maturity banner copy ───────────────────────────────────────────────
const MATURITY_BANNER: Record<DataMaturityStage, {
  label: string;
  color: string;
  bg: string;
  body: (logCount: number) => string;
}> = {
  generic: {
    label: "Phase guidance",
    color: "var(--color-text-dim)",
    bg: "rgba(156,163,175,0.08)",
    body: (n) => `These insights are based on your cycle phase — a universal hormonal model. They'll become specific to you after ${7 - n} more check-ins.`,
  },
  early: {
    label: "Patterns forming",
    color: "#C48A97",
    bg: "rgba(196,138,151,0.07)",
    body: (n) => `You have ${n} mood logs. Early patterns are starting to form — trends may shift as you add more data. Keep logging daily for the clearest picture.`,
  },
  personalized: {
    label: "Personalised",
    color: "#34D399",
    bg: "rgba(52,211,153,0.07)",
    body: (n) => `Based on ${n} logs across your cycle. These patterns are specific to you, not just your phase.`,
  },
};

// ── Language helpers — maturity-aware copy ─────────────────────────────────
function phrasePattern(stage: DataMaturityStage, phrase: string): string {
  if (stage === "personalized") return phrase;
  if (stage === "early")        return phrase.replace("Your ", "Your mood tends to be ").replace("is", "seems");
  return phrase; // generic — shouldn't be shown anyway
}

export default function InsightsPage() {
  const { user, loading, logCount, todayState, cycleDay, cycleParams, profile } = useApp();
  const phaseData = getPhaseData(cycleDay, cycleParams);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<InsightTab>("overview");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [meals,    setMeals]    = useState<MealLog[]>([]);
  const [moods,    setMoods]    = useState<MoodLog[]>([]);
  const [prs,      setPRs]      = useState<PersonalRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Derive maturity from context — same source as TodayState
  const maturity: DataMaturityStage = todayState?.dataMaturityStage ?? "generic";

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([
      supabase.from("workouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("meal_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(60),
      supabase.from("mood_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(90),
      getPRs(),
    ]).then(([w, m, mo, prData]) => {
      setWorkouts(w.data ?? []);
      setMeals(m.data ?? []);
      setMoods(mo.data ?? []);
      setPRs(prData);
      setDataLoading(false);
    });
  }, [user]);

  // ── Analytics computations — unchanged ─────────────────────────────────

  const moodByPhase = PHASES.map(phase => {
    const pm = moods.filter(m => m.phase === phase);
    if (!pm.length) return { phase, avgMood: null, avgEnergy: null, count: 0 };
    return {
      phase,
      avgMood:   pm.reduce((a, m) => a + (m.mood as unknown as number), 0) / pm.length,
      avgEnergy: pm.reduce((a, m) => a + (m.energy as unknown as number), 0) / pm.length,
      count: pm.length,
    };
  });
  const phasesWithMood = moodByPhase.filter(p => p.avgMood !== null);
  // Only declare best/worst if we have data across 2+ different phases
  const canComparePhases = phasesWithMood.length >= 2;
  const bestPhase  = canComparePhases ? phasesWithMood.reduce((a, b) => a.avgMood! > b.avgMood! ? a : b) : null;
  const worstPhase = canComparePhases ? phasesWithMood.reduce((a, b) => a.avgMood! < b.avgMood! ? a : b) : null;

  const symptomsByPhase = PHASES.map(phase => {
    const pm = moods.filter(m => m.phase === phase);
    const freq: Record<string, number> = {};
    pm.forEach(m => {
      const syms = m.symptoms as unknown as string[];
      if (syms) syms.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
    });
    return {
      phase, total: pm.length,
      symptoms: Object.entries(freq)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([symptom, count]) => ({ symptom, pct: Math.round((count / pm.length) * 100) })),
    };
  });

  const trainingByPhase = PHASES.map(phase => {
    const pw = workouts.filter(w => w.phase === phase);
    const vol = pw.reduce((acc, w) => {
      const exs = w.exercises as unknown as { sets: { reps: string; weight: string }[] }[];
      return acc + exs.reduce((a, e) => a + e.sets.reduce((s, r) => s + (parseFloat(r.reps)||0) * (parseFloat(r.weight)||0), 0), 0);
    }, 0);
    return { phase, count: pw.length, avgVolume: pw.length ? Math.round(vol / pw.length) : 0, totalVolume: Math.round(vol) };
  });
  const bestTrainingPhase = trainingByPhase.filter(p => p.count > 0).sort((a, b) => b.avgVolume - a.avgVolume)[0] ?? null;
  const maxVol = Math.max(...trainingByPhase.map(p => p.avgVolume), 1);

  const mealsByPhase = PHASES.map(phase => {
    const pm = meals.filter(m => m.phase === phase);
    let totalCal = 0, totalProt = 0, count = 0;
    pm.forEach(m => {
      const entries = m.meals as unknown as { calories: string; protein: string }[];
      const cal  = entries.reduce((a, e) => a + (parseFloat(e.calories) || 0), 0);
      const prot = entries.reduce((a, e) => a + (parseFloat(e.protein)  || 0), 0);
      if (cal > 0) { totalCal += cal; totalProt += prot; count++; }
    });
    return { phase, count: pm.length, avgCal: count ? Math.round(totalCal / count) : 0, avgProtein: count ? Math.round(totalProt / count) : 0 };
  });
  const maxCal = Math.max(...mealsByPhase.map(p => p.avgCal), 1);

  // ── Visibility thresholds ──────────────────────────────────────────────
  const hasAnyData    = moods.length >= 1 || workouts.length >= 1 || meals.length >= 1;
  const hasEnoughData = hasAnyData; // keep for compatibility — maturity handles gradation

  const bannerConfig  = MATURITY_BANNER[maturity];

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />

      <main className="relative mx-auto max-w-app px-4 pt-6 pb-12">

        {/* Header */}
        <header className="mb-5">
          <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Insights</p>
          <h1 className="font-display text-2xl font-semibold text-dark">Cycle Insights</h1>
        </header>

        {/* Phase card */}
        <PhaseCard
          phase={phaseData.phase}
          label={phaseData.label}
          description={(phaseData.aiRecommendation ?? phaseData.trainingDetail ?? "").split(".")[0]}
          cycleDay={cycleDay}
          className="mb-3"
        />

        {/* Tab bar */}
        <div className="flex rounded-2xl bg-surface p-1 shadow-card mb-4 gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {([
            { id: "overview", label: "Overview", emoji: "🌸" },
            { id: "training", label: "Training", emoji: "🏋️‍♀️" },
            { id: "meals",    label: "Meals",    emoji: "🥗" },
            { id: "mood",     label: "Mood",     emoji: "💭" },
            { id: "cycles",   label: "Cycles",   emoji: "🌙" },
          ] as { id: InsightTab; label: string; emoji: string }[]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-shrink-0 flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1"
              style={{
                background: activeTab === t.id ? "linear-gradient(135deg, #C96480, #A84468)" : "transparent",
                color: activeTab === t.id ? "var(--color-surface)" : "var(--color-text-dim)",
                minWidth: 56,
              }}>
              <span style={{ fontSize: 12 }}>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="text-center py-16"><p className="text-dark/40 text-sm">Loading insights…</p></div>

        ) : !hasAnyData ? (
          /* ── ZERO DATA: original progress empty state ── */
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-dark font-semibold text-base mb-2">Building your insights</p>
            <p className="text-dark/40 text-sm font-body mb-6 max-w-xs mx-auto">
              Log your mood, training, and meals for a few days and personalised insights will appear here automatically.
            </p>
            <div className="bg-surface rounded-2xl p-4 shadow-card text-left mb-4 max-w-xs mx-auto">
              <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Progress to first insights</p>
              {[
                { label: "Mood logs", current: moods.length,    target: 3, color: "#A78BFA", href: "/mood" },
                { label: "Workouts",  current: workouts.length, target: 3, color: "#C48A97", href: "/training" },
                { label: "Meal logs", current: meals.length,    target: 3, color: "#34D399", href: "/meals" },
              ].map(item => (
                <div key={item.label} className="mb-3 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-semibold text-dark">{item.label}</span>
                    <span className="text-xs text-dark/40">{Math.min(item.current, item.target)}/{item.target}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ghost overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((item.current / item.target) * 100, 100)}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => router.push("/mood")}
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #C96480, #A84468)" }}>
              Start with mood check-in →
            </button>
          </div>

        ) : (
          <>
            {/* ── DATA MATURITY BANNER — shown on all tabs ── */}
            <div className="rounded-2xl px-4 py-3 mb-4 flex items-start gap-3"
              style={{ background: bannerConfig.bg }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: bannerConfig.color }}>
                    {bannerConfig.label}
                  </span>
                  {maturity === "personalized" && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(52,211,153,0.15)", color: "#059669" }}>
                      ✓
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark/55 font-body leading-snug">
                  {bannerConfig.body(logCount)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-bold font-display" style={{ color: bannerConfig.color }}>
                  {logCount}
                </p>
                <p className="text-xs text-dark/30 font-body leading-none">logs</p>
              </div>
            </div>

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* Cycle ring + sparkline row */}
                <div className="flex gap-3 items-stretch">
                  <div className="rounded-[22px] p-4 flex flex-col items-center justify-center gap-1"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-soft)", minWidth: 0, flex: "0 0 auto" }}>
                    <CycleRing
                      cycleDay={cycleDay}
                      cycleLength={cycleParams?.cycleLength ?? 28}
                      periodLength={cycleParams?.periodLength ?? 5}
                      ovulationLength={2}
                      size={110}
                    />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mt-1" style={{ color: "var(--color-text-dim)" }}>Cycle</p>
                  </div>
                  {moods.length >= 2 && (
                    <div className="flex-1 min-w-0">
                      <Sparkline
                        values={moods.slice(0, 7).reverse().map(m => (m.energy as unknown as number) ?? 0)}
                        labels={moods.slice(0, 7).reverse().map(m => {
                          const d = new Date(m.date as string);
                          return ["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()];
                        })}
                        todayIndex={moods.slice(0, 7).length - 1}
                        title="Energy"
                        delta={moods.length > 0 ? `${(moods[0].energy as unknown as number) ?? 0}/5` : undefined}
                        height={60}
                      />
                    </div>
                  )}
                </div>

                {/* ── Today's insight — same source as Dashboard, richer layout ── */}
                {maturity !== "generic" && todayState?.insightTitle && (
                  <div
                    className="rounded-2xl p-5 shadow-card"
                    style={{ background: "rgba(196,138,151,0.07)", border: "1px solid rgba(196,138,151,0.12)" }}
                  >
                    <p className="text-xs font-semibold text-dark/40 uppercase tracking-widest mb-2">
                      Today's Insight
                    </p>
                    <p className="font-semibold text-dark text-base leading-snug mb-2">
                      {todayState.insightTitle}
                    </p>
                    <p className="text-sm text-dark/60 leading-relaxed font-body">
                      {todayState.insightBody}
                    </p>
                  </div>
                )}

                {/* Best/worst phase — only shown with 2+ phases and early/personalized */}
                {canComparePhases && maturity !== "generic" && (
                  <div className="grid grid-cols-2 gap-3">
                    {bestPhase && (
                      <div className="bg-surface rounded-2xl p-4 shadow-card"
                        style={{ borderLeft: `3px solid ${PHASE_COLORS[bestPhase.phase].dot}` }}>
                        <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2">
                          {maturity === "personalized" ? "Best phase" : "Highest mood"}
                        </p>
                        <span style={{ fontSize: 22 }}>{PHASE_EMOJIS[bestPhase.phase]}</span>
                        <p className="text-sm font-bold text-dark capitalize mt-1">{bestPhase.phase}</p>
                        <p className="text-xs text-dark/40 font-body">
                          {maturity === "personalized"
                            ? `avg mood ${bestPhase.avgMood!.toFixed(1)}/5`
                            : `mood ${bestPhase.avgMood!.toFixed(1)}/5 so far`}
                        </p>
                      </div>
                    )}
                    {worstPhase && worstPhase.phase !== bestPhase?.phase && (
                      <div className="bg-surface rounded-2xl p-4 shadow-card"
                        style={{ borderLeft: `3px solid ${PHASE_COLORS[worstPhase.phase].dot}` }}>
                        <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2">
                          {maturity === "personalized" ? "Needs support" : "Lower mood"}
                        </p>
                        <span style={{ fontSize: 22 }}>{PHASE_EMOJIS[worstPhase.phase]}</span>
                        <p className="text-sm font-bold text-dark capitalize mt-1">{worstPhase.phase}</p>
                        <p className="text-xs text-dark/40 font-body">
                          {maturity === "personalized"
                            ? `avg mood ${worstPhase.avgMood!.toFixed(1)}/5`
                            : `mood ${worstPhase.avgMood!.toFixed(1)}/5 so far`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* If generic and we have phase data but can't compare, show gentle nudge */}
                {maturity === "generic" && (
                  <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: "rgba(196,138,151,0.06)", border: "1px solid rgba(196,138,151,0.12)" }}>
                    <span className="text-xl flex-shrink-0">🌸</span>
                    <div>
                      <p className="text-xs font-semibold text-dark">Building your phase profile</p>
                      <p className="text-xs text-dark/45 font-body leading-snug mt-0.5">
                        Log daily across different phases and you'll see which ones feel best for you personally.
                      </p>
                    </div>
                  </div>
                )}

                {/* Summary stats — always shown */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Workouts",  value: workouts.length, color: "#C48A97" },
                    { label: "Mood logs", value: moods.length,    color: "#A78BFA" },
                    { label: "Meal logs", value: meals.length,    color: "#34D399" },
                  ].map(s => (
                    <div key={s.label} className="bg-surface rounded-2xl p-3 text-center shadow-card">
                      <p className="font-display font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* PR pattern card — unchanged, data-driven so always valid */}
                {prs.length > 0 && (() => {
                  const prByPhase: Record<string, number> = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 };
                  prs.forEach(pr => { if (pr.phase && prByPhase[pr.phase] !== undefined) prByPhase[pr.phase]++; });
                  const bestPRPhase = Object.entries(prByPhase).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <div className="rounded-2xl p-4 overflow-hidden relative" style={{ background: "var(--color-surface)", borderTop: "3px solid #FBBF24" }}>
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 pointer-events-none" style={{ background: "#FBBF24", filter: "blur(20px)" }} />
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#B45309" }}>
                            Strength pattern
                          </p>
                          <p className="text-base font-bold text-dark leading-tight">
                            {maturity === "personalized"
                              ? `You hit PRs in ${PHASE_EMOJIS[bestPRPhase[0]]} ${bestPRPhase[0]}`
                              : `Most PRs so far: ${PHASE_EMOJIS[bestPRPhase[0]]} ${bestPRPhase[0]}`}
                          </p>
                        </div>
                        <span className="text-2xl">🏆</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {PHASES.map(phase => (
                          <div key={phase} className="rounded-xl p-2 text-center"
                            style={{
                              background: phase === bestPRPhase[0] ? "rgba(251,191,36,0.15)" : "var(--color-ghost)",
                              outline: phase === bestPRPhase[0] ? "1px solid rgba(251,191,36,0.3)" : "none",
                            }}>
                            <p className="text-xs mb-1">{PHASE_EMOJIS[phase]}</p>
                            <p className="text-base font-bold text-dark">{prByPhase[phase]}</p>
                            <p className="text-xs" style={{ color: "var(--color-text-dim)" }}>PRs</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Mood by phase bars — always shown when data exists */}
                {phasesWithMood.length > 0 && (
                  <div className="bg-surface rounded-2xl shadow-card p-4">
                    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">Mood by phase</p>
                    {maturity === "generic" && (
                      <p className="text-xs text-dark/35 font-body mb-3">Based on limited data — patterns will sharpen with more logs.</p>
                    )}
                    {maturity === "early" && (
                      <p className="text-xs text-dark/35 font-body mb-3">Early trends — keep logging to confirm these patterns.</p>
                    )}
                    {maturity === "personalized" && (
                      <p className="text-xs text-dark/35 font-body mb-3">Your personalised mood profile across your cycle.</p>
                    )}
                    <div className="space-y-3">
                      {moodByPhase.map(p => (
                        <div key={p.phase}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 14 }}>{PHASE_EMOJIS[p.phase]}</span>
                              <span className="text-xs font-semibold text-dark capitalize">{p.phase}</span>
                            </div>
                            <span className="text-xs text-dark/30">{p.count > 0 ? `${p.count} logs` : "no data yet"}</span>
                          </div>
                          {p.count > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-ghost overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${(p.avgMood! / 5) * 100}%`, background: PHASE_COLORS[p.phase].dot }} />
                              </div>
                              <span className="text-xs font-semibold text-dark/50 w-6 text-right">{p.avgMood!.toFixed(1)}</span>
                            </div>
                          ) : (
                            <div className="h-2 bg-ghost rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleep by phase — unchanged */}
                {moods.filter(m => (m as any).sleep_hours).length >= 2 && (() => {
                  const sleepByPhase = PHASES.map(phase => {
                    const pm = moods.filter(m => m.phase === phase && (m as any).sleep_hours);
                    if (!pm.length) return { phase, avg: null, count: 0 };
                    const avg = pm.reduce((a, m) => a + ((m as any).sleep_hours as number), 0) / pm.length;
                    return { phase, avg: Math.round(avg * 10) / 10, count: pm.length };
                  });
                  const hasData = sleepByPhase.some(p => p.avg !== null);
                  if (!hasData) return null;
                  const worst = sleepByPhase.filter(p => p.avg !== null).sort((a, b) => a.avg! - b.avg!)[0];
                  return (
                    <div className="bg-surface rounded-2xl shadow-card p-4">
                      <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Avg sleep by phase</p>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {sleepByPhase.map(p => (
                          <div key={p.phase} className="rounded-xl p-2 text-center" style={{ background: PHASE_COLORS[p.phase].bg }}>
                            <p className="text-xs mb-1">{PHASE_EMOJIS[p.phase]}</p>
                            <p className="text-sm font-bold text-dark">{p.avg ? `${p.avg}h` : "—"}</p>
                          </div>
                        ))}
                      </div>
                      {worst && worst.avg !== null && (
                        <div className="rounded-xl px-3 py-2 text-xs font-body leading-snug" style={{ background: "rgba(196,138,151,0.06)", color: "var(--color-text-mid)" }}>
                          {maturity === "personalized"
                            ? `💡 You sleep least in ${PHASE_EMOJIS[worst.phase]} ${worst.phase} — this is your established pattern, hormonally driven.`
                            : `💡 Lowest sleep so far: ${PHASE_EMOJIS[worst.phase]} ${worst.phase}. This is common in this phase — log more to confirm your personal pattern.`}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Training overview */}
                {workouts.length > 0 && bestTrainingPhase && (
                  <div className="bg-surface rounded-2xl shadow-card p-4">
                    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">
                      {maturity === "personalized" ? "Strongest training phase" : "Most active phase so far"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: PHASE_COLORS[bestTrainingPhase.phase].bg }}>
                        {PHASE_EMOJIS[bestTrainingPhase.phase]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark capitalize">{bestTrainingPhase.phase}</p>
                        <p className="text-xs text-dark/40 font-body">
                          avg {bestTrainingPhase.avgVolume.toLocaleString()} kg volume · {bestTrainingPhase.count} sessions
                          {maturity !== "personalized" && " so far"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TRAINING ── */}
            {activeTab === "training" && (
              <div className="space-y-4">
                {workouts.length === 0 ? (
                  <EmptyInsight
                    emoji="🏋️‍♀️"
                    text="No workouts logged yet"
                    sub={maturity === "generic"
                      ? "Log 3+ sessions across your cycle to see training patterns by phase."
                      : "Add workouts to see how your strength and volume shift across your cycle."}
                    cta="Go to Training" href="/training" router={router}
                  />
                ) : (
                  <>
                    <div className="bg-surface rounded-2xl shadow-card p-4">
                      <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">
                        Workouts & avg volume by phase
                      </p>
                      {maturity !== "personalized" && (
                        <p className="text-xs text-dark/35 font-body mb-3">
                          {maturity === "early"
                            ? "Early trends — continue logging across phases for a clearer pattern."
                            : "Log sessions in more phases to build your training profile."}
                        </p>
                      )}
                      <div className="space-y-3 mt-3">
                        {trainingByPhase.map(p => (
                          <div key={p.phase}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 14 }}>{PHASE_EMOJIS[p.phase]}</span>
                                <span className="text-xs font-semibold text-dark capitalize">{p.phase}</span>
                              </div>
                              <span className="text-xs text-dark/30">
                                {p.count > 0 ? `${p.count} sessions · ${p.avgVolume.toLocaleString()} kg avg` : "no data yet"}
                              </span>
                            </div>
                            {p.count > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-ghost overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${(p.avgVolume / maxVol) * 100}%`, background: PHASE_COLORS[p.phase].dot }} />
                                </div>
                                <span className="text-xs font-semibold text-dark/50 w-16 text-right">{p.avgVolume.toLocaleString()} kg</span>
                              </div>
                            ) : (
                              <div className="h-2 bg-ghost rounded-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Total sessions", value: workouts.length, color: "#C48A97" },
                        { label: "Total volume", value: `${Math.round(trainingByPhase.reduce((a, p) => a + p.totalVolume, 0) / 1000 * 10) / 10}t`, color: "#7B6D8D" },
                      ].map(s => (
                        <div key={s.label} className="bg-surface rounded-2xl p-4 text-center shadow-card">
                          <p className="font-display font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── MEALS ── */}
            {activeTab === "meals" && (
              <div className="space-y-4">
                {meals.length === 0 ? (
                  <EmptyInsight
                    emoji="🥗"
                    text="No meals logged yet"
                    sub={maturity === "generic"
                      ? "Log meals across your cycle to see how your nutrition naturally shifts by phase."
                      : "Add meal logs to see nutrition patterns across your phases."}
                    cta="Go to Meals" href="/meals" router={router}
                  />
                ) : (
                  <>
                    <div className="bg-surface rounded-2xl shadow-card p-4">
                      <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">
                        Avg daily calories by phase
                      </p>
                      {maturity !== "personalized" && (
                        <p className="text-xs text-dark/35 font-body mb-3">
                          {maturity === "early"
                            ? "Early data — your calorie patterns will clarify as you log across more phases."
                            : "Log meals in different phases to see how your intake shifts hormonally."}
                        </p>
                      )}
                      <div className="space-y-3 mt-3">
                        {mealsByPhase.map(p => (
                          <div key={p.phase}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 14 }}>{PHASE_EMOJIS[p.phase]}</span>
                                <span className="text-xs font-semibold text-dark capitalize">{p.phase}</span>
                              </div>
                              <span className="text-xs text-dark/30">
                                {p.count > 0 ? `${p.avgCal} kcal · ${p.avgProtein}g P` : "no data yet"}
                              </span>
                            </div>
                            {p.count > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-ghost overflow-hidden">
                                  <div className="h-full rounded-full transition-all" style={{ width: `${(p.avgCal / maxCal) * 100}%`, background: PHASE_COLORS[p.phase].dot }} />
                                </div>
                                <span className="text-xs font-semibold text-dark/50 w-16 text-right">{p.avgCal} kcal</span>
                              </div>
                            ) : (
                              <div className="h-2 bg-ghost rounded-full" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Days logged", value: meals.length, color: "#34D399" },
                        { label: "Avg protein", value: `${Math.round(mealsByPhase.filter(p => p.count > 0).reduce((a, p) => a + p.avgProtein, 0) / Math.max(mealsByPhase.filter(p => p.count > 0).length, 1))}g`, color: "#7B6D8D" },
                      ].map(s => (
                        <div key={s.label} className="bg-surface rounded-2xl p-4 text-center shadow-card">
                          <p className="font-display font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── CYCLES ── */}
            {activeTab === "cycles" && (() => {
              const phaseData    = getPhaseData(cycleDay, cycleParams);
              const dayInPhase   = getDayInPhase(cycleDay, cycleParams);
              const cycleLength  = profile?.cycle_length ?? 28;
              const periodLength = profile?.period_length ?? 5;
              const startDate    = profile?.period_start_date
                ? new Date(profile.period_start_date)
                : null;
              const phaseSegs = [
                { phase: "menstrual",  color: "#F87171", bg: "#FEE2E2", pct: Math.round((periodLength / cycleLength) * 100) },
                { phase: "follicular", color: "#34D399", bg: "#D1FAE5", pct: Math.round((cycleLength * 0.29) / cycleLength * 100) },
                { phase: "ovulation",  color: "#FBBF24", bg: "#FEF3C7", pct: Math.round((cycleLength * 0.11) / cycleLength * 100) },
                { phase: "luteal",     color: "#A78BFA", bg: "#EDE9FE", pct: 100 - Math.round((periodLength / cycleLength) * 100) - Math.round((cycleLength * 0.29) / cycleLength * 100) - Math.round((cycleLength * 0.11) / cycleLength * 100) },
              ];
              return (
                <div className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Cycle length", value: `${cycleLength}d` },
                      { label: "Period length", value: `${periodLength}d` },
                      { label: "Current day", value: `Day ${cycleDay}` },
                    ].map(s => (
                      <div key={s.label} className="bg-surface rounded-2xl p-3 text-center shadow-card">
                        <p className="font-display font-bold text-base text-dark leading-tight">{s.value}</p>
                        <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mt-1 leading-tight">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Current cycle card */}
                  <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ background: PHASE_COLORS[phaseData.phase].bg }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: PHASE_COLORS[phaseData.phase].dot }} />
                        <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: PHASE_COLORS[phaseData.phase].text }}>
                          {phaseData.phase} phase
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: PHASE_COLORS[phaseData.phase].bg, color: PHASE_COLORS[phaseData.phase].text }}>
                        In progress
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-dark">Current cycle</p>
                        {startDate && (
                          <p className="text-xs text-dark/40 font-body">
                            Started {startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-dark/40 font-body mb-3">
                        Day {cycleDay} of {cycleLength} · Day {dayInPhase} in {phaseData.phase}
                      </p>
                      {/* Phase strip */}
                      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden mb-2">
                        {phaseSegs.map(seg => (
                          <div key={seg.phase} className="rounded-full transition-all duration-300"
                            style={{ width: `${seg.pct}%`, background: seg.color, opacity: seg.phase === phaseData.phase ? 1 : 0.3 }} />
                        ))}
                      </div>
                      {/* Phase dots legend */}
                      <div className="flex justify-between">
                        {[
                          { label: "🌙", phase: "menstrual" },
                          { label: "🌱", phase: "follicular" },
                          { label: "⚡", phase: "ovulation" },
                          { label: "🍂", phase: "luteal" },
                        ].map(seg => (
                          <span key={seg.phase} className="text-xs" style={{ opacity: seg.phase === phaseData.phase ? 1 : 0.3 }}>
                            {seg.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Phase breakdown */}
                  <div className="bg-surface rounded-2xl shadow-card p-4">
                    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">This cycle&apos;s phases</p>
                    <div className="space-y-2">
                      {phaseSegs.map(seg => (
                        <div key={seg.phase} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                            style={{ background: seg.bg }}>
                            {PHASE_EMOJIS[seg.phase]}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-0.5">
                              <p className="text-xs font-semibold text-dark capitalize">{seg.phase}</p>
                              <p className="text-xs text-dark/30 font-body">{Math.round((seg.pct / 100) * cycleLength)}d</p>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden bg-ghost">
                              <div className="h-full rounded-full" style={{ width: `${seg.pct}%`, background: seg.color, opacity: seg.phase === phaseData.phase ? 1 : 0.4 }} />
                            </div>
                          </div>
                          {seg.phase === phaseData.phase && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: seg.bg, color: seg.color }}>Now</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Future cycle notice */}
                  <div className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: "rgba(196,138,151,0.06)", border: "1px solid rgba(196,138,151,0.12)" }}>
                    <span className="text-xl flex-shrink-0">🌸</span>
                    <div>
                      <p className="text-xs font-semibold text-dark">Cycle history builds automatically</p>
                      <p className="text-xs text-dark/45 font-body leading-snug mt-1">
                        After each period, your previous cycle is archived here. Log your next period start date to begin tracking multi-cycle patterns.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── MOOD ── */}
            {activeTab === "mood" && (
              <div className="space-y-4">
                {moods.length === 0 ? (
                  <EmptyInsight
                    emoji="💭"
                    text="No mood logs yet"
                    sub="Log your mood and energy daily to see how your cycle affects how you feel."
                    cta="Go to Mood" href="/mood" router={router}
                  />
                ) : (
                  <>
                    {/* Mood + energy averages */}
                    <div className="bg-surface rounded-2xl shadow-card p-4">
                      <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">
                        Mood & energy by phase
                      </p>
                      {maturity === "generic" && (
                        <p className="text-xs text-dark/35 font-body mb-3">
                          Phase averages based on your check-ins so far. Keep logging to see your personal patterns.
                        </p>
                      )}
                      {maturity === "early" && (
                        <p className="text-xs text-dark/35 font-body mb-3">
                          Early patterns — {28 - logCount} more logs will unlock your full personalised cycle profile.
                        </p>
                      )}
                      {maturity === "personalized" && (
                        <p className="text-xs text-dark/35 font-body mb-3">
                          Your personalised mood and energy profile across your cycle.
                        </p>
                      )}
                      <div className="space-y-4">
                        {moodByPhase.map(p => {
                          const color = PHASE_COLORS[p.phase].dot;
                          return (
                            <div key={p.phase}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span style={{ fontSize: 14 }}>{PHASE_EMOJIS[p.phase]}</span>
                                  <span className="text-xs font-semibold text-dark capitalize">{p.phase}</span>
                                </div>
                                <span className="text-xs text-dark/30">{p.count > 0 ? `${p.count} logs` : "no data yet"}</span>
                              </div>
                              {p.count > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-dark/40 w-10 flex-shrink-0">Mood</span>
                                    <div className="flex-1 h-2 rounded-full bg-ghost overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${(p.avgMood! / 5) * 100}%`, background: color }} />
                                    </div>
                                    <span className="text-xs font-semibold text-dark/50 w-6 text-right">{p.avgMood!.toFixed(1)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-dark/40 w-10 flex-shrink-0">Energy</span>
                                    <div className="flex-1 h-2 rounded-full bg-ghost overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${(p.avgEnergy! / 5) * 100}%`, background: color, opacity: 0.5 }} />
                                    </div>
                                    <span className="text-xs font-semibold text-dark/50 w-6 text-right">{p.avgEnergy!.toFixed(1)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-4 bg-ghost rounded-full" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sleep chart */}
                    {moods.length >= 3 && (
                      <div className="bg-surface rounded-2xl shadow-card p-4">
                        <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">
                          Sleep hours by phase
                        </p>
                        <SleepChart
                          entries={moods.map(m => ({
                            date:          m.date as string,
                            phase:         m.phase as string,
                            sleep_hours:   (m.sleep_hours as unknown as number | null) ?? null,
                            sleep_quality: (m.sleep_quality as unknown as number | null) ?? null,
                          }))}
                        />
                        <div className="flex justify-between mt-2">
                          <span className="text-[10px] text-dark/30">Oldest</span>
                          <span className="text-[10px] text-dark/30">Recent</span>
                        </div>
                      </div>
                    )}

                    {/* Symptom patterns */}
                    <p className="text-xs font-semibold text-secondary uppercase tracking-wide px-1">
                      {maturity === "personalized" ? "Your symptom patterns" : "Symptom patterns so far"}
                    </p>
                    {symptomsByPhase.filter(p => p.symptoms.length > 0).map(p => (
                      <div key={p.phase} className="bg-surface rounded-2xl shadow-card p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span style={{ fontSize: 18 }}>{PHASE_EMOJIS[p.phase]}</span>
                          <p className="text-sm font-bold text-dark capitalize">{p.phase}</p>
                          <span className="text-xs text-dark/30 ml-auto">{p.total} entries</span>
                        </div>
                        <div className="space-y-2">
                          {p.symptoms.map(({ symptom, pct }) => (
                            <div key={symptom} className="flex items-center gap-2">
                              <span className="text-xs text-dark/70 font-body flex-1 truncate">{symptom}</span>
                              <div className="w-24 h-1.5 rounded-full bg-ghost overflow-hidden flex-shrink-0">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PHASE_COLORS[p.phase].dot }} />
                              </div>
                              <span className="text-xs font-semibold text-dark/40 w-8 text-right flex-shrink-0">{pct}%</span>
                            </div>
                          ))}
                        </div>
                        {maturity !== "personalized" && (
                          <p className="text-xs text-dark/30 font-body mt-3 leading-snug">
                            Based on {p.total} {p.total === 1 ? "entry" : "entries"} — more logs will confirm this pattern.
                          </p>
                        )}
                      </div>
                    ))}
                    {symptomsByPhase.every(p => p.symptoms.length === 0) && (
                      <div className="bg-surface rounded-2xl shadow-card p-6 text-center">
                        <p className="text-dark/40 text-sm">No symptom data yet</p>
                        <p className="text-dark/30 text-xs font-body mt-1">Log symptoms in the Mood tab to see patterns here</p>
                      </div>
                    )}

                    {/* Symptom pattern insight cards — personalized stage only */}
                    {maturity === "personalized" && (() => {
                      const patterns: { phase: string; symptom: string; pct: number }[] = [];
                      symptomsByPhase.forEach(({ phase, total, symptoms }) => {
                        if (total < 5) return;
                        symptoms.forEach(({ symptom, pct }) => {
                          if (pct >= 50) patterns.push({ phase, symptom, pct });
                        });
                      });
                      if (patterns.length === 0) return null;
                      return (
                        <div>
                          <p className="text-xs font-semibold text-secondary uppercase tracking-wide px-1 mb-2">
                            Your recurring patterns
                          </p>
                          <div className="space-y-2">
                            {patterns.slice(0, 6).map(({ phase, symptom, pct }) => {
                              const color = PHASE_COLORS[phase]?.dot ?? "#C48A97";
                              return (
                                <div
                                  key={`${phase}-${symptom}`}
                                  className="rounded-2xl px-4 py-3 flex items-center gap-3"
                                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                                >
                                  <span
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                                    style={{ background: `${color}18`, color }}
                                  >
                                    ✦
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-dark">
                                      You often report{" "}
                                      <span style={{ color }}>{symptom}</span>
                                    </p>
                                    <p className="text-xs font-body text-dark/40 mt-0.5">
                                      in your {phase} phase · {pct}% of check-ins
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* See all logs link */}
        {hasEnoughData && (
          <button onClick={() => router.push("/history")}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-dark/40 flex items-center justify-center gap-2 mb-4 active:scale-95 transition-all"
            style={{ background: "rgba(var(--color-text-rgb),0.03)" }}>
            📋 See all logs
            <span className="text-dark/25">→</span>
          </button>
        )}
      </main>
    </div>
  );
}

function EmptyInsight({ emoji, text, sub, cta, href, router }: {
  emoji: string; text: string; sub: string; cta: string; href: string;
  router: ReturnType<typeof import("next/navigation").useRouter>;
}) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-dark font-semibold text-sm mb-1">{text}</p>
      <p className="text-dark/40 text-xs font-body mb-4">{sub}</p>
      <button onClick={() => router.push(href)}
        className="text-xs font-semibold px-4 py-2 rounded-xl text-white"
        style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
        {cta} →
      </button>
    </div>
  );
}
