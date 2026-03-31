"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/onboarding/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { calculateMacros, ACTIVITY_LABELS, GOAL_LABELS, type ActivityLevel, type BodyGoal } from "@/lib/macros";

const avatarColors = [
  "linear-gradient(135deg, #C48A97, #7B6D8D)",
  "linear-gradient(135deg, #7B6D8D, #4F4665)",
  "linear-gradient(135deg, #F87171, #C48A97)",
  "linear-gradient(135deg, #34D399, #7B6D8D)",
  "linear-gradient(135deg, #FBBF24, #C48A97)",
];

const fitnessGoals = [
  { label: "Build muscle",        emoji: "💪" },
  { label: "Lose fat",            emoji: "🔥" },
  { label: "Improve endurance",   emoji: "🏃‍♀️" },
  { label: "Reduce PMS symptoms", emoji: "🌸" },
  { label: "Better sleep",        emoji: "😴" },
  { label: "More energy",         emoji: "⚡" },
];

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const { user, loading, refreshProfile } = useApp();
  const router = useRouter();

  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Profile — prefill from Google if available
  const googleName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";
  const [name, setName]               = useState(googleName);
  const [avatarIndex, setAvatarIndex] = useState(0);

  // Sync name if user loads after component mounts (Google OAuth)
  useEffect(() => {
    if (!name && user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    }
  }, [user]);

  // Step 2 — Cycle
  const [cycleLength, setCycleLength]   = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [periodStartDate, setPeriodStartDate] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Step 3 — Macros (optional)
  const [heightCm, setHeightCm]         = useState("");
  const [weightKg, setWeightKg]         = useState("");
  const [age, setAge]                   = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [bodyGoal, setBodyGoal]         = useState<BodyGoal>("recomposition");
  const [macroResult, setMacroResult]   = useState<ReturnType<typeof calculateMacros> | null>(null);
  const [skipMacros, setSkipMacros]     = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  function toggleGoal(g: string) {
    setSelectedGoals(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);
  }

  function canProceed() {
    if (step === 1) return name.trim().length > 0;
    return true;
  }

  function handleCalculate() {
    const h = parseFloat(heightCm), w = parseFloat(weightKg), a = parseInt(age);
    if (!h || !w || !a) return;
    setMacroResult(calculateMacros({ heightCm: h, weightKg: w, age: a, activityLevel, bodyGoal }));
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);

    try {
      const updates: Record<string, unknown> = {
        name: name.trim() || "User",
        avatar_index: avatarIndex,
        cycle_length: cycleLength,
        period_length: periodLength,
        goals: selectedGoals,
        updated_at: new Date().toISOString(),
      };

      // Save period start date if provided — sets accurate cycle day from day 1
      if (periodStartDate) {
        updates.period_start_date = periodStartDate;
        // Calculate cycle day from the date
        const start = new Date(periodStartDate);
        const today = new Date();
        const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        updates.cycle_day = Math.min(Math.max(1, diff + 1), cycleLength);
      }

      // Save macros if calculated
      if (macroResult && !skipMacros) {
        updates.height_cm          = parseFloat(heightCm);
        updates.weight_kg          = parseFloat(weightKg);
        updates.age                = parseInt(age);
        updates.activity_level     = activityLevel;
        updates.body_goal          = bodyGoal;
        updates.calculated_calories = macroResult.targetCalories;
        updates.calculated_protein  = macroResult.protein;
        updates.calculated_carbs    = macroResult.carbs;
        updates.calculated_fats     = macroResult.fats;
      }

      await supabase.from("profiles").update(updates).eq("id", user.id);
      localStorage.setItem(`herphase_onboarded_${user.id}`, "true");
      await refreshProfile();
      router.replace("/dashboard");
    } catch {
      localStorage.setItem(`herphase_onboarded_${user.id}`, "true");
      router.replace("/dashboard");
    }
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

  if (loading || !user) return (
    <PageSkeleton />
  );

  const canCalc = heightCm && weightKg && age && parseFloat(heightCm) > 0 && parseFloat(weightKg) > 0 && parseInt(age) > 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-72 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.22) 0%, transparent 70%)" }} />

      <main className="relative z-10 flex flex-col flex-1 mx-auto w-full max-w-app px-4 pt-10 pb-8">

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-10">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-accent">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: i <= step ? "100%" : "0%", background: "linear-gradient(90deg, #C48A97, #7B6D8D)" }} />
            </div>
          ))}
        </div>

        {/* ── Step 0: Welcome + What to expect ── */}
        {step === 0 && (
          <div className="flex flex-col flex-1 animate-fade-up">
            <div className="flex-1 flex flex-col items-center text-center pt-4">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-soft"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                🌸
              </div>
              <h1 className="font-display text-3xl font-semibold text-dark mb-2 leading-tight">
                Welcome to<br />HerPhase
              </h1>
              <p className="text-secondary font-body text-sm leading-relaxed max-w-xs mb-8">
                Your fitness app that adapts to your cycle — smarter training, better nutrition, every day.
              </p>

              {/* What you'll get */}
              <div className="w-full space-y-3 text-left mb-6">
                {[
                  {
                    emoji: "🏋️",
                    title: "Training that fits your energy",
                    desc: "Lift heavy in follicular, go easy in menstrual. The app tells you exactly what to do each day.",
                  },
                  {
                    emoji: "🥗",
                    title: "Food recommendations by phase",
                    desc: "Iron during menstrual, protein in ovulation, magnesium in luteal. Phase-aware food every day.",
                  },
                  {
                    emoji: "🏆",
                    title: "Track PRs and see your pattern",
                    desc: "After a few cycles you'll see exactly which phase makes you strongest.",
                  },
                  {
                    emoji: "💭",
                    title: "Understand your mood and energy",
                    desc: "Log daily, and HerPhase shows you why you felt that way — and what's coming next.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 bg-white rounded-2xl px-4 py-3.5 shadow-card">
                    <span className="text-xl flex-shrink-0 mt-0.5">{item.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-dark leading-tight">{item.title}</p>
                      <p className="text-xs text-dark/45 font-body mt-0.5 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-dark/30 font-body">Setup takes about 2 minutes</p>
            </div>
          </div>
        )}

        {/* ── Step 1: Name + Avatar ── */}
        {step === 1 && (
          <div className="flex flex-col flex-1 animate-fade-up">
            <div className="mb-8">
              <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Step 1 of 3</p>
              <h2 className="font-display text-2xl font-semibold text-dark">Let's get to know you</h2>
              <p className="text-secondary text-sm font-body mt-1">Choose your avatar and tell us your name.</p>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-display font-bold mb-4 shadow-soft transition-all duration-300"
                style={{ background: avatarColors[avatarIndex] }}>
                {name.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex gap-3">
                {avatarColors.map((grad, i) => (
                  <button key={i} onClick={() => setAvatarIndex(i)}
                    className="w-9 h-9 rounded-full transition-all duration-200 active:scale-90"
                    style={{ background: grad, transform: avatarIndex === i ? "scale(1.2)" : "scale(1)", border: avatarIndex === i ? "3px solid #2E2E2E" : "3px solid transparent" }} />
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl px-4 py-4 shadow-card">
              <label className="text-xs font-semibold text-dark/50 uppercase tracking-wide block mb-2">Your name</label>
              <input type="text" placeholder="e.g. Ana, Maria, Sara…" value={name}
                onChange={(e) => setName(e.target.value)} autoFocus
                className="w-full text-dark font-display font-semibold text-2xl outline-none placeholder:text-dark/20 bg-transparent" />
            </div>
          </div>
        )}

        {/* ── Step 2: Cycle + Goals ── */}
        {step === 2 && (
          <div className="flex flex-col flex-1 animate-fade-up overflow-y-auto">
            <div className="mb-6">
              <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Step 2 of 3</p>
              <h2 className="font-display text-2xl font-semibold text-dark">Your cycle & goals</h2>
              <p className="text-secondary text-sm font-body mt-1">Helps us personalise everything for you.</p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-sm font-semibold text-dark">Cycle length</p>
                <p className="text-xs text-dark/40 font-body">Average days between periods</p></div>
                <span className="text-lg font-display font-bold text-primary">{cycleLength}d</span>
              </div>
              <input type="range" min={21} max={35} value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-dark/30 mt-1"><span>21</span><span>28</span><span>35</span></div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-card mb-4">
              <div className="flex items-center justify-between mb-2">
                <div><p className="text-sm font-semibold text-dark">Period length</p>
                <p className="text-xs text-dark/40 font-body">How many days it lasts</p></div>
                <span className="text-lg font-display font-bold text-primary">{periodLength}d</span>
              </div>
              <input type="range" min={2} max={8} value={periodLength} onChange={(e) => setPeriodLength(Number(e.target.value))} className="w-full" />
              <div className="flex justify-between text-xs text-dark/30 mt-1"><span>2</span><span>5</span><span>8</span></div>
            </div>

            {/* Period start date — new field */}
            <div className="bg-white rounded-2xl p-4 shadow-card mb-4">
              <p className="text-sm font-semibold text-dark mb-0.5">When did your last period start?</p>
              <p className="text-xs text-dark/40 font-body mb-3">This tells us exactly where you are in your cycle today. Without it we'll assume Day 8. You can always update this later.</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🩸</span>
                <input
                  type="date"
                  value={periodStartDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPeriodStartDate(e.target.value)}
                  className="flex-1 bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors"
                />
              </div>
              {periodStartDate && (() => {
                const start = new Date(periodStartDate);
                const today = new Date();
                const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const day = Math.min(Math.max(1, diff + 1), cycleLength);
                return (
                  <p className="text-xs text-primary font-semibold mt-2">
                    → You're on Day {day} of your cycle 🌸
                  </p>
                );
              })()}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-card mb-4">
              <p className="text-sm font-semibold text-dark mb-1">What are your goals?</p>
              <p className="text-xs text-dark/40 font-body mb-3">Select all that apply</p>
              <div className="grid grid-cols-2 gap-2">
                {fitnessGoals.map((g) => {
                  const active = selectedGoals.includes(g.label);
                  return (
                    <button key={g.label} onClick={() => toggleGoal(g.label)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm font-medium text-left transition-all active:scale-95"
                      style={{ background: active ? "rgba(196,138,151,0.12)" : "#F9FAFB", color: active ? "#C48A97" : "#6B7280", border: `1.5px solid ${active ? "rgba(196,138,151,0.35)" : "transparent"}` }}>
                      <span className="text-base">{g.emoji}</span>
                      <span className="font-semibold text-xs leading-tight">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Macro Calculator (optional) ── */}
        {step === 3 && (
          <div className="flex flex-col flex-1 animate-fade-up overflow-y-auto">
            <div className="mb-5">
              <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Step 3 of 3 · Optional</p>
              <h2 className="font-display text-2xl font-semibold text-dark">Calculate your macros</h2>
              <p className="text-secondary text-sm font-body mt-1">
                Get personalised daily calorie and macro targets. You can always do this later in Profile.
              </p>
            </div>

            {!skipMacros && (
              <>
                {/* Body metrics */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Height", placeholder: "170", value: heightCm, onChange: setHeightCm, unit: "cm" },
                    { label: "Weight", placeholder: "65", value: weightKg, onChange: setWeightKg, unit: "kg" },
                    { label: "Age",    placeholder: "28", value: age,      onChange: setAge,      unit: "yr" },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-1.5">{f.label}</label>
                      <div className="relative">
                        <input type="number" placeholder={f.placeholder} value={f.value}
                          onChange={(e) => f.onChange(e.target.value)}
                          className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors pr-8 shadow-card" />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark/30 font-semibold">{f.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Activity */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Activity level</label>
                  <div className="space-y-1.5">
                    {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([key, label]) => (
                      <button key={key} onClick={() => setActivityLevel(key)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all"
                        style={{ background: activityLevel === key ? "rgba(196,138,151,0.12)" : "white", border: `1.5px solid ${activityLevel === key ? "rgba(196,138,151,0.35)" : "transparent"}` }}>
                        <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{ borderColor: activityLevel === key ? "#C48A97" : "#D1D5DB" }}>
                          {activityLevel === key && <span className="w-2 h-2 rounded-full bg-primary" />}
                        </span>
                        <span className="text-xs font-medium" style={{ color: activityLevel === key ? "#C48A97" : "#6B7280" }}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body goal */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Body goal</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(GOAL_LABELS) as [BodyGoal, typeof GOAL_LABELS[BodyGoal]][]).map(([key, g]) => (
                      <button key={key} onClick={() => setBodyGoal(key)}
                        className="flex flex-col items-center gap-1 px-2 py-3 rounded-2xl transition-all active:scale-95"
                        style={{ background: bodyGoal === key ? "rgba(196,138,151,0.12)" : "white", border: `1.5px solid ${bodyGoal === key ? "rgba(196,138,151,0.35)" : "transparent"}` }}>
                        <span className="text-xl">{g.emoji}</span>
                        <span className="text-xs font-bold" style={{ color: bodyGoal === key ? "#C48A97" : "#374151" }}>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculate button */}
                <button onClick={handleCalculate} disabled={!canCalc}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white mb-3 disabled:opacity-40 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                  Calculate 🧮
                </button>

                {/* Results */}
                {macroResult && (
                  <div className="rounded-2xl p-4 mb-3" style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white/50 text-xs">Daily target</p>
                        <p className="text-white font-display font-bold text-2xl">{macroResult.targetCalories} kcal</p>
                      </div>
                      <div className="text-right text-xs text-white/40 font-body">
                        {macroResult.deficit && <p>−{macroResult.deficit} kcal deficit</p>}
                        {macroResult.surplus && <p>+{macroResult.surplus} kcal surplus</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Protein", value: macroResult.protein, color: "#C48A97" },
                        { label: "Carbs",   value: macroResult.carbs,   color: "#EDD5DB" },
                        { label: "Fats",    value: macroResult.fats,    color: "#A78BFA" },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                          <p className="font-display font-bold text-lg text-white">{m.value}g</p>
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: m.color }}>{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Skip macros option */}
            <button onClick={() => setSkipMacros(!skipMacros)}
              className="text-center text-xs text-dark/40 font-body w-full mb-2">
              {skipMacros ? "↑ Set up macros instead" : "Skip macros for now →"}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6 flex-shrink-0">
          {step > 0 && (
            <button onClick={back}
              className="w-14 py-4 rounded-2xl font-semibold text-dark/40 bg-white shadow-card transition-all active:scale-95">
              ←
            </button>
          )}
          <button onClick={next} disabled={!canProceed() || saving}
            className="flex-1 py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-40 shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Setting up…
              </span>
            ) : step === 0 ? "Get Started →"
              : step === TOTAL_STEPS - 1 ? "Start My Journey 🌸"
              : "Continue →"}
          </button>
        </div>

        {step === 0 && (
          <button onClick={skip} className="text-center text-xs text-dark/30 mt-4 font-body w-full">
            Skip for now
          </button>
        )}
      </main>
    </div>
  );
}
