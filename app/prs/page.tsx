"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/prs/page.tsx — Personal Records tracker
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import { savePR, getPRs, getBestPRPerExercise, deletePR, type PersonalRecord } from "@/lib/supabase";
import { EXERCISES } from "@/lib/exercises";
import PhaseLineChart from "@/components/PhaseLineChart";
import type { LineSeries } from "@/lib/chartTypes";
import type { Phase } from "@/lib/cycle";

const PHASE_STYLES: Record<string, { bg: string; text: string; emoji: string }> = {
  menstrual:  { bg: "rgba(248,113,113,0.12)",  text: "#DC2626", emoji: "🌙" },
  follicular: { bg: "rgba(52,211,153,0.12)",   text: "#059669", emoji: "🌱" },
  ovulation:  { bg: "rgba(251,191,36,0.12)",   text: "#B45309", emoji: "⚡" },
  luteal:     { bg: "rgba(167,139,250,0.12)",  text: "#6D28D9", emoji: "🍂" },
};

// PRO GATE — flip to true when paywall is ready
const IS_PRO_FEATURE = false;

export default function PRsPage() {
  const router = useRouter();
  const { user, profile, loading, cycleParams } = useApp();
  const cycleDay = profile?.cycle_day ?? 1;
  const phaseData = getPhaseData(cycleDay, cycleParams);

  const [tab, setTab] = useState<"log" | "history" | "bests">("bests");
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [bests, setBests] = useState<PersonalRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── PR chart state ─────────────────────────────────────────────────────────
  const exerciseNames = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pr of prs) counts[pr.exercise] = (counts[pr.exercise] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [prs]);

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const activeExercise = selectedExercise ?? exerciseNames[0] ?? null;

  // Log form state
  const [exercise, setExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    Promise.all([getPRs(), getBestPRPerExercise()]).then(([all, best]) => {
      setPRs(all);
      setBests(best);
      setDataLoading(false);
    });
  }, [user]);

  const exerciseSuggestions = useMemo(() => {
    if (!exercise.trim() || exercise.length < 2) return [];
    const q = exercise.toLowerCase();
    return EXERCISES.filter(e => e.name.toLowerCase().includes(q)).slice(0, 5);
  }, [exercise]);

  async function handleLog() {
    if (!exercise.trim() || !reps || !weight) return;
    setSaveStatus("loading");
    const result = await savePR({
      exercise: exercise.trim(),
      reps: parseInt(reps),
      weight: parseFloat(weight),
      notes: notes.trim() || undefined,
      phase: phaseData.phase,
      cycle_day: cycleDay,
    });
    if (result.success) {
      setSaveStatus("success");
      const [all, best] = await Promise.all([getPRs(), getBestPRPerExercise()]);
      setPRs(all);
      setBests(best);
      setExercise("");
      setReps("");
      setWeight("");
      setNotes("");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }

  async function handleDelete(id: number) {
    await deletePR(id);
    const [all, best] = await Promise.all([getPRs(), getBestPRPerExercise()]);
    setPRs(all);
    setBests(best);
  }

  if (loading || !user) return <PageSkeleton />;

  // PRO GATE UI
  if (IS_PRO_FEATURE) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center pb-24">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="font-display text-2xl font-semibold text-dark mb-2">PR Tracker</h2>
        <p className="text-sm text-dark/50 font-body mb-6 max-w-xs">Track personal records and see which phase you're strongest in. Available in HerPhase Pro.</p>
        <button
          className="px-8 py-3.5 rounded-2xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          onClick={() => router.push("/profile")}>
          Upgrade to Pro
        </button>
      </div>
    );
  }

  const phaseStyle = PHASE_STYLES[phaseData.phase] ?? PHASE_STYLES.follicular;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-28">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-dark/40 transition-all active:scale-90"
            style={{ background: "var(--color-surface)" }}>
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-0.5">Strength</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Personal Records</h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: phaseStyle.bg, color: phaseStyle.text }}>
            {phaseStyle.emoji} Day {cycleDay}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["bests", "log", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                background: tab === t ? "linear-gradient(135deg, #C48A97, #7B6D8D)" : "var(--color-surface)",
                color: tab === t ? "var(--color-surface)" : "var(--color-text-dim)",
                boxShadow: "0 1px 4px rgba(var(--color-text-rgb),0.06)",
              }}>
              {t === "bests" ? "🏆 Bests" : t === "log" ? "➕ Log PR" : "📋 History"}
            </button>
          ))}
        </div>

        {/* ── BESTS TAB ── */}
        {tab === "bests" && (
          <div>
            {dataLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-dark/5 animate-pulse" />)}
              </div>
            ) : bests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🏆</div>
                <p className="text-sm font-semibold text-dark/40">No records yet</p>
                <p className="text-xs text-dark/30 font-body mt-1">Log your first PR and it'll appear here</p>
                <button onClick={() => setTab("log")}
                  className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                  Log first PR
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {bests.map((pr, i) => {
                  const ps = pr.phase ? PHASE_STYLES[pr.phase] : null;
                  return (
                    <div key={i} className="bg-surface rounded-2xl px-4 py-3.5 shadow-card">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-dark truncate">{pr.exercise}</p>
                          <p className="text-xs text-dark/50 font-body mt-0.5">
                            {pr.reps} reps × {pr.weight}kg
                            <span className="text-dark/30"> · {pr.logged_at}</span>
                          </p>
                        </div>
                        {ps && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
                            style={{ background: ps.bg, color: ps.text }}>
                            {ps.emoji}
                          </span>
                        )}
                      </div>
                      {pr.notes && (
                        <p className="text-xs text-dark/40 font-body mt-2 pl-13">{pr.notes}</p>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-center text-dark/30 font-body pt-2">Showing best weight per exercise</p>
              </div>
            )}
          </div>
        )}

        {/* ── LOG TAB ── */}
        {tab === "log" && (
          <div className="space-y-3">
            {/* Phase context */}
            <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", borderLeft: `3px solid ${phaseStyle.text}` }}>
              <p className="text-xs uppercase tracking-widest font-body mb-1"
                style={{ color: "var(--color-text-dim)" }}>
                {phaseStyle.emoji} {phaseData.phase} phase · Day {cycleDay}
              </p>
              <p className="text-sm font-semibold text-dark">
                {phaseData.phase === "ovulation" || phaseData.phase === "follicular"
                  ? "Peak strength window — great time to hit a PR 💪"
                  : phaseData.phase === "menstrual"
                  ? "Low energy phase — log any achievement, every rep counts"
                  : "Luteal phase — focus on technique over maximal weight"}
              </p>
            </div>

            {/* Exercise */}
            <div className="bg-surface rounded-2xl p-4 shadow-card relative">
              <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">Exercise</p>
              <input type="text"
                placeholder="e.g. Bench Press, Squat, Deadlift…"
                value={exercise}
                onChange={(e) => { setExercise(e.target.value); setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="w-full text-sm text-dark bg-background rounded-xl px-3 py-2.5 outline-none font-body" />
              {showSuggestions && exerciseSuggestions.length > 0 && (
                <div className="absolute left-4 right-4 top-20 bg-surface rounded-xl shadow-lg z-20 overflow-hidden border border-[var(--color-border)]">
                  {exerciseSuggestions.map(e => (
                    <button key={e.id} onMouseDown={() => { setExercise(e.name); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-dark hover:bg-background transition-colors border-b border-[var(--color-border)] last:border-0">
                      {e.name}
                      <span className="text-xs text-dark/30 ml-2">{e.muscle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reps + Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface rounded-2xl p-4 shadow-card">
                <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">Reps</p>
                <input type="number" placeholder="8" value={reps}
                  onChange={(e) => setReps(e.target.value)} min="1" max="200"
                  className="w-full text-xl font-bold text-dark text-center bg-background rounded-xl px-3 py-2 outline-none" />
              </div>
              <div className="bg-surface rounded-2xl p-4 shadow-card">
                <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">Weight (kg)</p>
                <input type="number" placeholder="80" value={weight}
                  onChange={(e) => setWeight(e.target.value)} min="0" step="0.5"
                  className="w-full text-xl font-bold text-dark text-center bg-background rounded-xl px-3 py-2 outline-none" />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-surface rounded-2xl p-4 shadow-card">
              <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">Notes (optional)</p>
              <input type="text" placeholder="e.g. Paused reps, competition style…"
                value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm text-dark bg-background rounded-xl px-3 py-2.5 outline-none font-body" />
            </div>

            {/* Save */}
            <button onClick={handleLog}
              disabled={!exercise.trim() || !reps || !weight || saveStatus === "loading"}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all active:scale-95 disabled:opacity-40"
              style={{ background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)" : "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
              {saveStatus === "loading" ? "Saving…"
                : saveStatus === "success" ? "🏆 PR Logged!"
                : !exercise.trim() || !reps || !weight ? "Fill in all fields"
                : "Log Personal Record"}
            </button>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div>
            {dataLoading ? (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-dark/5 animate-pulse" />)}
              </div>
            ) : prs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-sm font-semibold text-dark/40">No records logged yet</p>
                <button onClick={() => setTab("log")}
                  className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                  Log first PR
                </button>
              </div>
            ) : (
              <>
                {/* Exercise filter — horizontal scroll, one chip per exercise */}
                {exerciseNames.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
                    {exerciseNames.map(name => (
                      <button
                        key={name}
                        onClick={() => setSelectedExercise(name)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
                        style={{
                          background: activeExercise === name
                            ? "linear-gradient(135deg, #C48A97, #7B6D8D)"
                            : "var(--color-surface)",
                          color: activeExercise === name
                            ? "var(--color-surface)"
                            : "var(--color-text-dim)",
                          boxShadow: "0 1px 4px rgba(var(--color-text-rgb),0.06)",
                        }}>
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                {/* PR progression chart */}
                {(() => {
                  if (!activeExercise) return null;
                  const chartPRs = prs
                    .filter(pr => pr.exercise === activeExercise)
                    .sort((a, b) => (a.logged_at ?? "").localeCompare(b.logged_at ?? ""));
                  if (chartPRs.length < 2) return null;

                  const series: LineSeries[] = [{
                    id:     "pr-weight",
                    label:  activeExercise,
                    color:  "#C48A97",
                    points: chartPRs.map(pr => ({
                      date:  pr.logged_at ?? "",
                      value: pr.weight,
                      phase: pr.phase as Phase | undefined,
                    })),
                  }];

                  return (
                    <div className="bg-surface rounded-2xl p-4 shadow-card mb-3">
                      <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">
                        {activeExercise} — weight progression
                      </p>
                      <PhaseLineChart
                        series={series}
                        phaseBands={[]}
                        showPoints={true}
                        pointColorMode="phase"
                        showLegend={false}
                        height={120}
                        windowDays={365}
                      />
                      <div className="flex flex-wrap gap-3 mt-2">
                        {(["menstrual","follicular","ovulation","luteal"] as const).map(ph => {
                          const colors: Record<string, string> = {
                            menstrual: "#F87171", follicular: "#34D399",
                            ovulation: "#FBBF24", luteal: "#A78BFA",
                          };
                          return (
                            <div key={ph} className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors[ph] }} />
                              <span className="text-xs text-dark/40 capitalize font-body">{ph}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* PR log list — filtered to active exercise */}
                <div className="space-y-2">
                  {prs
                    .filter(pr => !activeExercise || pr.exercise === activeExercise)
                    .map((pr) => {
                      const ps = pr.phase ? PHASE_STYLES[pr.phase] : null;
                      return (
                        <div key={pr.id} className="bg-surface rounded-2xl px-4 py-3.5 shadow-card">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-dark">{pr.exercise}</p>
                                {ps && (
                                  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ background: ps.bg, color: ps.text }}>
                                    {ps.emoji} {pr.phase}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-dark/50 font-body mt-0.5">
                                {pr.reps} reps × {pr.weight}kg · {pr.logged_at}
                              </p>
                              {pr.notes && <p className="text-xs text-dark/35 font-body mt-0.5">{pr.notes}</p>}
                            </div>
                            <button onClick={() => pr.id && handleDelete(pr.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-dark/20 hover:text-rose-400 transition-colors flex-shrink-0"
                              style={{ background: "var(--color-ghost)" }}>
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
