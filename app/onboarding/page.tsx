"use client";
import PageSkeleton from "@/components/PageSkeleton";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { calcCycleDayFromDate, getPhaseData } from "@/lib/cycle";

// ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4; // 0=Welcome 1=Cycle 2=Goals 3=You're set

const GOAL_OPTIONS = [
  { value: "Train smarter",  icon: "💪", title: "Train smarter",  desc: "Phase-based workouts" },
  { value: "Eat for phase",  icon: "🥗", title: "Eat for phase",  desc: "Macro guidance by day" },
  { value: "Track energy",   icon: "⚡", title: "Track energy",   desc: "Mood + stamina trends" },
  { value: "Better sleep",   icon: "💤", title: "Better sleep",   desc: "Recovery insights" },
  { value: "Ease symptoms",  icon: "🩺", title: "Ease symptoms",  desc: "Cramps, bloating, mood" },
  { value: "Conceive",       icon: "🌸", title: "Conceive",       desc: "Fertile window tracking" },
];

const PHASE_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  menstrual:  { bg: "#FFF1F2", text: "#9F1239", border: "#FECDD3", icon: "🌙" },
  follicular: { bg: "#F0FDF4", text: "#1B8A60", border: "#A7F3D0", icon: "🌱" },
  ovulation:  { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", icon: "☀️" },
  luteal:     { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE", icon: "🌕" },
};

const PHASE_LABELS: Record<string, string> = {
  menstrual:  "Menstrual",
  follicular: "Follicular",
  ovulation:  "Ovulation",
  luteal:     "Luteal",
};

const PHASE_HIGHLIGHTS: Record<string, [string, string][]> = {
  menstrual:  [["🧘", "Gentle movement"], ["🥬", "Iron + omega-3"], ["🌡️", "Rest well"]],
  follicular: [["💪", "Heavy strength"],  ["🥩", "Iron + protein"],  ["💧", "2.5L water"]],
  ovulation:  [["🏋️", "Peak power"],      ["⚡", "High protein"],    ["🧘", "Mobility too"]],
  luteal:     [["🚶", "Moderate load"],   ["🫚", "Magnesium rich"],  ["😴", "Prioritise sleep"]],
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

// ── Calendar helpers ─────────────────────────────────────────────────────────

interface CalCell { day: number; dateStr: string; dim: boolean }

function buildCalendar(year: number, month: number): CalCell[] {
  const firstDow  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const daysInPrev= new Date(year, month, 0).getDate();
  const cells: CalCell[] = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, dim: true });
  }
  for (let d = 1; d <= daysInMo; d++) {
    cells.push({ day: d, dateStr: `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, dim: false });
  }
  const rem = 35 - cells.length;
  for (let d = 1; d <= rem; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, dateStr: `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, dim: true });
  }
  return cells;
}

function isPeriodDay(dateStr: string, periodStart: string, periodLength: number): boolean {
  if (!periodStart) return false;
  const s = new Date(periodStart + "T00:00:00").getTime();
  const e = s + (periodLength - 1) * 86400000;
  const d = new Date(dateStr + "T00:00:00").getTime();
  return d >= s && d <= e;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, loading, refreshProfile } = useApp();
  const router = useRouter();

  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Cycle
  const [cycleLength, setCycleLength]   = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [periodStartDate, setPeriodStartDate] = useState("");

  // Calendar state
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Step 2 — Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Derived: cycle day + phase (for step 3 preview)
  const cycleDay = periodStartDate ? calcCycleDayFromDate(periodStartDate, cycleLength) : 0;
  const phaseData = getPhaseData(cycleDay || 1, { cycleLength, periodLength });
  const phase = phaseData.phase;
  const phaseStyle = PHASE_COLORS[phase] ?? PHASE_COLORS.follicular;
  const userName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.user_metadata?.name?.split(" ")[0] ?? "";

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  const calCells = buildCalendar(calYear, calMonth);
  const todayStr = now.toISOString().split("T")[0];

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    const maxDate = new Date(todayStr + "T00:00:00");
    const proposed = new Date(calYear, calMonth + 1, 1);
    if (proposed > maxDate) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  function selectDate(dateStr: string) {
    if (dateStr > todayStr) return;
    setPeriodStartDate(dateStr);
  }

  function toggleGoal(v: string) {
    setSelectedGoals(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  }

  function canProceed() {
    if (step === 1) return true; // period date optional but encouraged
    return true;
  }

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else handleFinish();
  }

  function back() { if (step > 0) setStep(s => s - 1); }

  function skip() {
    if (user) localStorage.setItem(`herphase_onboarded_${user.id}`, "true");
    router.replace("/dashboard");
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        goals: selectedGoals,
        cycle_length: cycleLength,
        period_length: periodLength,
        updated_at: new Date().toISOString(),
      };
      if (periodStartDate) {
        updates.period_start_date = periodStartDate;
        updates.cycle_day = calcCycleDayFromDate(periodStartDate, cycleLength);
      }
      await supabase.from("profiles").update(updates).eq("id", user.id);
      if (periodStartDate) {
        await supabase.from("user_cycle_history").upsert([{
          user_id:                user.id,
          cycle_start_date:       periodStartDate,
          cycle_length_at_start:  cycleLength,
          period_length_at_start: periodLength,
          source:                 "manual_set",
        }], { onConflict: "user_id,cycle_start_date", ignoreDuplicates: true });
      }
      localStorage.setItem(`herphase_onboarded_${user.id}`, "true");
      await refreshProfile();
      router.replace("/dashboard");
    } catch {
      localStorage.setItem(`herphase_onboarded_${user.id}`, "true");
      router.replace("/dashboard");
    }
  }

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Rose glow */}
      <div className="fixed top-0 left-0 right-0 pointer-events-none z-0"
        style={{ height: "300px", background: "radial-gradient(ellipse 95% 80% at 50% -5%, rgba(232,130,154,0.44) 0%, rgba(255,195,210,0.28) 30%, transparent 70%)" }} />

      <main className="relative z-10 flex flex-col flex-1 mx-auto w-full max-w-app px-5 pt-10 pb-8">

        {/* Progress dots */}
        {step > 0 && (
          <div className="flex justify-center gap-1.5 mb-8">
            {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => {
              const dotStep = i + 1;
              const done    = step > dotStep;
              const active  = step === dotStep;
              return (
                <div key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: active ? "22px" : "6px",
                    background: done || active ? "#E8829A" : "rgba(232,130,154,0.25)",
                    opacity: done ? 0.75 : 1,
                  }} />
              );
            })}
          </div>
        )}

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="flex flex-col flex-1 items-center text-center animate-fade-up">
            {/* Animated bloom */}
            <div className="relative my-6" style={{ width: 180, height: 180 }}>
              <svg viewBox="0 0 180 180" width="180" height="180">
                <defs>
                  <radialGradient id="bloomG" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FDE8ED"/>
                    <stop offset="100%" stopColor="#E8829A"/>
                  </radialGradient>
                </defs>
                <g style={{ transformOrigin: "50% 50%", animation: "petalPulse 5s ease-in-out infinite" }}>
                  <ellipse cx="90" cy="50" rx="22" ry="38" fill="url(#bloomG)" opacity="0.85"/>
                  <ellipse cx="90" cy="130" rx="22" ry="38" fill="url(#bloomG)" opacity="0.85"/>
                  <ellipse cx="50" cy="90" rx="38" ry="22" fill="url(#bloomG)" opacity="0.85"/>
                  <ellipse cx="130" cy="90" rx="38" ry="22" fill="url(#bloomG)" opacity="0.85"/>
                  <ellipse cx="62" cy="62" rx="26" ry="30" fill="url(#bloomG)" opacity="0.7" transform="rotate(-45 62 62)"/>
                  <ellipse cx="118" cy="62" rx="26" ry="30" fill="url(#bloomG)" opacity="0.7" transform="rotate(45 118 62)"/>
                  <ellipse cx="62" cy="118" rx="26" ry="30" fill="url(#bloomG)" opacity="0.7" transform="rotate(45 62 118)"/>
                  <ellipse cx="118" cy="118" rx="26" ry="30" fill="url(#bloomG)" opacity="0.7" transform="rotate(-45 118 118)"/>
                </g>
                <circle cx="90" cy="90" r="18" fill="#C96480"/>
                <circle cx="90" cy="90" r="10" fill="#F4B8C6"/>
              </svg>
              <style>{`@keyframes petalPulse{0%,100%{transform:scale(1) rotate(0deg);opacity:.9}50%{transform:scale(1.08) rotate(8deg);opacity:1}}`}</style>
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#E8829A" }}>Herphase</p>
            <h1 className="font-display text-3xl font-semibold text-dark leading-tight mb-3" style={{ letterSpacing: "-0.015em" }}>
              Train with your <em style={{ fontStyle: "italic", color: "#C96480" }}>cycle</em>,<br/>not against it.
            </h1>
            <p className="text-sm font-body leading-relaxed max-w-xs mb-10" style={{ color: "var(--color-text-mid)" }}>
              Personalized training, nutrition and recovery that adapt to every phase of your cycle.
            </p>

            <div className="w-full mt-auto space-y-3">
              <button onClick={next}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all active:scale-95 shadow-soft"
                style={{ background: "linear-gradient(135deg, #E8829A, #C96480)", boxShadow: "0 8px 22px rgba(201,100,128,0.38)" }}>
                Get started
              </button>
              <button onClick={skip} className="w-full text-center text-xs font-body py-2" style={{ color: "var(--color-text-dim)" }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Cycle ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 animate-fade-up overflow-y-auto">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#E8829A" }}>Step 1 of 3</p>
              <h2 className="font-display text-2xl font-semibold text-dark leading-tight" style={{ letterSpacing: "-0.015em" }}>
                When did your last<br/>period <em style={{ fontStyle: "italic", color: "#C96480" }}>start?</em>
              </h2>
              <p className="text-sm font-body mt-1" style={{ color: "var(--color-text-mid)" }}>
                We'll use this to show you where you are in your cycle today.
              </p>
            </div>

            {/* Mini calendar */}
            <div className="bg-surface rounded-2xl p-4 shadow-card mb-3">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-90"
                  style={{ background: "rgba(232,130,154,0.1)", color: "#C96480" }}>
                  ‹
                </button>
                <p className="text-xs font-bold uppercase tracking-widest text-dark">
                  {MONTH_NAMES[calMonth]} {calYear}
                </p>
                <button onClick={nextMonth}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-90"
                  style={{
                    background: "rgba(232,130,154,0.1)", color: "#C96480",
                    opacity: `${calYear}-${String(calMonth + 1).padStart(2,"0")}-01` > todayStr ? 0.3 : 1,
                  }}>
                  ›
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 mb-1">
                {DOW.map((d, i) => (
                  <div key={i} className="text-center py-1" style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-y-1">
                {calCells.map((cell, i) => {
                  const isToday   = cell.dateStr === todayStr;
                  const isPeriod  = isPeriodDay(cell.dateStr, periodStartDate, periodLength);
                  const isSelected= cell.dateStr === periodStartDate;
                  const isFuture  = cell.dateStr > todayStr;

                  return (
                    <button
                      key={i}
                      onClick={() => !isFuture && !cell.dim && selectDate(cell.dateStr)}
                      disabled={isFuture || cell.dim}
                      className="flex items-center justify-center rounded-lg transition-all active:scale-90"
                      style={{
                        height: "30px",
                        fontSize: "11px",
                        fontWeight: isSelected || isToday ? 700 : 400,
                        color: isSelected ? "white"
                             : isToday    ? "white"
                             : isPeriod   ? "#9F1239"
                             : cell.dim   ? "rgba(var(--color-text-rgb),0.2)"
                             : isFuture   ? "rgba(var(--color-text-rgb),0.2)"
                             : "var(--color-text-mid)",
                        background: isSelected
                          ? "linear-gradient(135deg, #E8829A, #C96480)"
                          : isToday
                          ? "linear-gradient(135deg, #C96480, #9B3060)"
                          : isPeriod
                          ? "#FECDD3"
                          : "transparent",
                        cursor: (isFuture || cell.dim) ? "default" : "pointer",
                      }}>
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {periodStartDate && (
                <p className="text-xs font-semibold mt-3 text-center" style={{ color: "#E8829A" }}>
                  → You're on Day {cycleDay} of your cycle 🌸
                </p>
              )}
            </div>

            {/* Cycle length + Period length steppers */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: "Cycle length", value: cycleLength, min: 21, max: 35, set: setCycleLength, unit: "days" },
                { label: "Period length", value: periodLength, min: 2, max: 8, set: setPeriodLength, unit: "days" },
              ].map((f) => (
                <div key={f.label} className="bg-surface rounded-2xl p-4 shadow-card">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-dim)", fontSize: "9px", letterSpacing: "0.12em" }}>{f.label}</p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => f.set(v => Math.max(f.min, v - 1))}
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-all active:scale-90"
                      style={{ background: "rgba(232,130,154,0.1)", color: "#C96480" }}>
                      −
                    </button>
                    <div className="text-center">
                      <p className="font-display font-bold text-xl text-dark">{f.value}</p>
                      <p className="text-xs font-body" style={{ color: "var(--color-text-dim)", fontSize: "10px" }}>{f.unit}</p>
                    </div>
                    <button
                      onClick={() => f.set(v => Math.min(f.max, v + 1))}
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base transition-all active:scale-90"
                      style={{ background: "rgba(232,130,154,0.1)", color: "#C96480" }}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {!periodStartDate && (
              <p className="text-xs font-body text-center mb-2" style={{ color: "var(--color-text-dim)" }}>
                Tap a day on the calendar to set your period start date
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Goals ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 animate-fade-up">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#E8829A" }}>Step 2 of 3</p>
              <h2 className="font-display text-2xl font-semibold text-dark leading-tight" style={{ letterSpacing: "-0.015em" }}>
                What matters to<br/>you <em style={{ fontStyle: "italic", color: "#C96480" }}>right now?</em>
              </h2>
              <p className="text-sm font-body mt-1 mb-5" style={{ color: "var(--color-text-mid)" }}>
                Pick all that apply — we'll tune your daily focus accordingly.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 flex-1">
              {GOAL_OPTIONS.map((g) => {
                const sel = selectedGoals.includes(g.value);
                return (
                  <button key={g.value} onClick={() => toggleGoal(g.value)}
                    className="relative text-left rounded-2xl p-3.5 transition-all active:scale-95 shadow-card"
                    style={{
                      background: sel ? "linear-gradient(180deg, #FFFDFE, #FDE8ED)" : "var(--color-surface)",
                      border: `1px solid ${sel ? "#E8829A" : "var(--color-border)"}`,
                      boxShadow: sel ? "0 4px 14px rgba(232,130,154,0.25)" : "var(--shadow-card)",
                    }}>
                    {sel && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center text-white"
                        style={{ background: "#E8829A", fontSize: "9px", fontWeight: 700 }}>
                        ✓
                      </div>
                    )}
                    <span className="text-xl block mb-1.5">{g.icon}</span>
                    <p className="text-xs font-bold text-dark leading-tight mb-0.5" style={{ letterSpacing: "-0.01em" }}>{g.title}</p>
                    <p className="text-[10px] font-body leading-snug" style={{ color: "var(--color-text-mid)" }}>{g.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: You're set ── */}
        {step === 3 && (
          <div className="flex flex-col flex-1 animate-fade-up">
            <div className="mb-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#E8829A" }}>
                All set{userName ? `, ${userName}` : ""}
              </p>
              <h2 className="font-display text-2xl font-semibold text-dark leading-tight" style={{ letterSpacing: "-0.015em" }}>
                {periodStartDate
                  ? <>You're on <em style={{ fontStyle: "italic", color: "#C96480" }}>day {cycleDay}.</em></>
                  : <>You're <em style={{ fontStyle: "italic", color: "#C96480" }}>ready.</em></>}
              </h2>
              <p className="text-sm font-body mt-1" style={{ color: "var(--color-text-mid)" }}>
                Here's what we'll focus on today.
              </p>
            </div>

            {/* Phase preview card */}
            <div className="relative rounded-2xl p-5 mb-4 text-center overflow-hidden"
              style={{
                background: `linear-gradient(180deg, white, ${phaseStyle.bg})`,
                border: `1px solid ${phaseStyle.border}`,
                boxShadow: "0 8px 24px rgba(201,100,128,0.12)",
              }}>
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 relative z-10"
                style={{ background: phaseStyle.bg, boxShadow: `0 4px 12px ${phaseStyle.border}88` }}>
                {phaseStyle.icon}
              </div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1 relative z-10" style={{ color: phaseStyle.text, letterSpacing: "0.08em" }}>
                {PHASE_LABELS[phase]}{periodStartDate ? ` · Day ${cycleDay}` : ""}
              </p>
              <p className="font-display text-xl font-semibold text-dark mb-2 relative z-10" style={{ fontStyle: "italic" }}>
                {phaseData.label}
              </p>
              <p className="text-xs font-body leading-relaxed relative z-10 max-w-xs mx-auto" style={{ color: "var(--color-text-mid)" }}>
                {phaseData.trainingDetail?.split(".")[0]}.
              </p>
            </div>

            {/* Highlight tiles */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(PHASE_HIGHLIGHTS[phase] ?? PHASE_HIGHLIGHTS.follicular).map(([ico, lbl]) => (
                <div key={lbl} className="bg-surface rounded-xl py-3 px-2 text-center shadow-card"
                  style={{ border: "1px solid var(--color-border)" }}>
                  <span className="text-sm block mb-1">{ico}</span>
                  <p className="font-bold leading-tight" style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-dim)" }}>
                    {lbl}
                  </p>
                </div>
              ))}
            </div>

            {selectedGoals.length > 0 && (
              <div className="bg-surface rounded-2xl px-4 py-3 shadow-card mb-3"
                style={{ border: "1px solid var(--color-border)" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "9px" }}>
                  Your focus
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedGoals.map(g => (
                    <span key={g} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(232,130,154,0.1)", color: "#C96480" }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-5 flex-shrink-0">
          {step > 0 && step < TOTAL_STEPS - 1 && (
            <button onClick={back}
              className="w-12 py-4 rounded-2xl font-semibold bg-surface shadow-card transition-all active:scale-95"
              style={{ color: "var(--color-text-dim)" }}>
              ←
            </button>
          )}

          {step > 0 && (
            <button onClick={next} disabled={saving}
              className="flex-1 py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #E8829A, #C96480)", boxShadow: "0 8px 22px rgba(201,100,128,0.38)" }}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Setting up…
                </span>
              ) : step === 2 && selectedGoals.length > 0
                ? `Continue · ${selectedGoals.length} selected`
                : step === TOTAL_STEPS - 1
                ? "Enter Herphase →"
                : "Continue →"}
            </button>
          )}
        </div>

        {step > 0 && step < TOTAL_STEPS - 1 && (
          <button onClick={skip} className="text-center text-xs font-body mt-3 w-full" style={{ color: "var(--color-text-dim)" }}>
            Skip
          </button>
        )}

      </main>
    </div>
  );
}
