"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/profile/page.tsx
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { saveProfile, signOut, supabase } from "@/lib/supabase";
import {
  calculateMacros, ACTIVITY_LABELS, GOAL_LABELS,
  type ActivityLevel, type BodyGoal,
} from "@/lib/macros";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const avatarColors = [
  "linear-gradient(135deg, #C48A97, #7B6D8D)",
  "linear-gradient(135deg, #7B6D8D, #4F4665)",
  "linear-gradient(135deg, #F87171, #C48A97)",
  "linear-gradient(135deg, #34D399, #7B6D8D)",
  "linear-gradient(135deg, #FBBF24, #C48A97)",
];

const goals = [
  "Build muscle", "Lose fat", "Improve endurance",
  "Reduce PMS symptoms", "Better sleep", "More energy",
];

export default function ProfilePage() {
  const { user, profile, refreshProfile, loading } = useApp();
  const router = useRouter();
  const push = usePushNotifications(user?.id ?? null);

  // Profile state
  const [name, setName]               = useState("Ana");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [units, setUnits]             = useState<"kg" | "lbs">("kg");
  const [notifications, setNotifications] = useState(true);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");

  // Macro calculator state
  const [showCalc, setShowCalc]           = useState(false);
  const [showAdvancedCycle, setShowAdvancedCycle] = useState(false);
  const [ovulationLength, setOvulationLength] = useState(3);
  const [heightCm, setHeightCm]           = useState("");
  const [weightKg, setWeightKg]           = useState("");
  const [age, setAge]                     = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [bodyGoal, setBodyGoal]           = useState<BodyGoal>("recomposition");
  const [macroResult, setMacroResult]     = useState<ReturnType<typeof calculateMacros> | null>(null);
  const [calcSaved, setCalcSaved]         = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "Ana");
      setCycleLength(profile.cycle_length ?? 28);
      setPeriodLength(profile.period_length ?? 5);
      setOvulationLength(profile.ovulation_length ?? 3);
      setAvatarIndex(profile.avatar_index ?? 0);
      setAvatarUrl(profile.avatar_url ?? null);
      setSelectedGoals(profile.goals ?? []);
      setUnits(profile.units ?? "kg");
      setNotifications(profile.notifications ?? true);
      // Pre-fill calculator if saved
      if (profile.height_cm) setHeightCm(String(profile.height_cm));
      if (profile.weight_kg) setWeightKg(String(profile.weight_kg));
      if (profile.age) setAge(String(profile.age));
      if (profile.activity_level) setActivityLevel(profile.activity_level as ActivityLevel);
      if (profile.body_goal) setBodyGoal(profile.body_goal as BodyGoal);
      if (profile.calculated_calories) {
        setMacroResult({
          bmr: 0,
          tdee: 0,
          targetCalories: profile.calculated_calories,
          protein: profile.calculated_protein ?? 0,
          carbs: profile.calculated_carbs ?? 0,
          fats: profile.calculated_fats ?? 0,
        });
        setCalcSaved(true);
      }
    }
  }, [profile]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate size (max 5MB) and type
    if (file.size > 5 * 1024 * 1024) return;
    if (!file.type.startsWith("image/")) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // bust cache

      setAvatarUrl(publicUrl);
      await saveProfile({ avatar_url: publicUrl });
      await refreshProfile();
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;
    setAvatarUrl(null);
    await saveProfile({ avatar_url: undefined });
    await refreshProfile();
  }

  function toggleGoal(g: string) {
    setSelectedGoals(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g]);
  }

  async function handleSave() {
    setSaveStatus("loading");
    const result = await saveProfile({
      name, cycle_length: cycleLength, period_length: periodLength, ovulation_length: ovulationLength,
      avatar_index: avatarIndex, goals: selectedGoals, units, notifications,
      cycle_day: profile?.cycle_day ?? 1,
    });
    if (result.success) { await refreshProfile(); setSaveStatus("success"); }
    else setSaveStatus("error");
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  function handleCalculate() {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    const a = parseInt(age);
    if (!h || !w || !a || h < 100 || h > 250 || w < 30 || w > 300 || a < 13 || a > 100) return;
    const result = calculateMacros({ heightCm: h, weightKg: w, age: a, activityLevel, bodyGoal });
    setMacroResult(result);
    setCalcSaved(false);
  }

  async function handleSaveMacros() {
    if (!macroResult) return;
    await saveProfile({
      height_cm: parseFloat(heightCm),
      weight_kg: parseFloat(weightKg),
      age: parseInt(age),
      activity_level: activityLevel,
      body_goal: bodyGoal,
      calculated_calories: macroResult.targetCalories,
      calculated_protein: macroResult.protein,
      calculated_carbs: macroResult.carbs,
      calculated_fats: macroResult.fats,
    });
    await refreshProfile();
    setCalcSaved(true);
  }

  async function handleLogout() {
    await signOut();
    router.replace("/auth");
  }

  const canCalculate = heightCm && weightKg && age &&
    parseFloat(heightCm) > 0 && parseFloat(weightKg) > 0 && parseInt(age) > 0;

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Settings</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Your Profile 👤</h1>
          </div>
          <button onClick={handleLogout}
            className="text-xs font-semibold text-dark/40 hover:text-rose-400 transition-colors px-3 py-1.5 rounded-xl bg-white shadow-card">
            Sign out
          </button>
        </header>

        {/* Account */}
        <div className="bg-white rounded-2xl px-4 py-3 shadow-card mb-3">
          <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mb-0.5">Account</p>
          <p className="text-dark text-sm font-medium">{user.email}</p>
        </div>

        {/* Avatar + name */}
        <div className="bg-white rounded-2xl p-5 shadow-card mb-3 flex flex-col items-center">
          {/* Avatar — photo or colour gradient */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-soft flex items-center justify-center"
              style={{ background: avatarUrl ? "transparent" : avatarColors[avatarIndex] }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-4xl font-display font-bold">
                  {name.charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>

            {/* Upload button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-soft transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
              title="Upload photo">
              {avatarUploading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Remove photo / colour swatches */}
          {avatarUrl ? (
            <button onClick={handleRemoveAvatar}
              className="text-xs text-dark/30 hover:text-rose-400 font-body mb-3 transition-colors">
              Remove photo
            </button>
          ) : (
            <div className="flex gap-2 mb-3">
              {avatarColors.map((grad, i) => (
                <button key={i} onClick={() => setAvatarIndex(i)}
                  className="w-7 h-7 rounded-full transition-all active:scale-90"
                  style={{ background: grad, border: avatarIndex === i ? "2.5px solid #2E2E2E" : "2.5px solid transparent" }} />
              ))}
            </div>
          )}

          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="text-center text-dark font-display font-semibold text-xl outline-none bg-transparent w-full" placeholder="Your name" />
          <p className="text-dark/40 text-xs font-body mt-1">
            {avatarUrl ? "Tap camera icon to change photo" : "Tap 📷 to upload a photo"}
          </p>
        </div>

        {/* Cycle settings */}
        <div className="bg-white rounded-2xl shadow-card mb-3 overflow-hidden">
          <button
            onClick={() => setShowAdvancedCycle(v => !v)}
            className="w-full flex items-center justify-between px-4 py-4 transition-all"
            style={{ background: showAdvancedCycle ? "rgba(196,138,151,0.06)" : "transparent" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background: "rgba(196,138,151,0.1)" }}>🩸</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-dark">Cycle settings</p>
                <p className="text-xs text-dark/40 font-body mt-0.5">
                  {cycleLength}d cycle · {periodLength}d period · {ovulationLength}d ovulation
                </p>
              </div>
            </div>
            <span className="text-dark/30 text-sm transition-transform duration-200"
              style={{ transform: showAdvancedCycle ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
          </button>

          {showAdvancedCycle && (() => {
            const ovEnd  = Math.round(cycleLength / 2) - Math.floor(ovulationLength / 2) + ovulationLength - 1;
            const folEnd = Math.round(cycleLength / 2) - Math.floor(ovulationLength / 2) - 1;
            const folLen = Math.max(1, folEnd - periodLength);
            const lutLen = Math.max(1, cycleLength - ovEnd);
            return (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-5 pt-4">

                {/* Cycle length */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-dark">Cycle length</label>
                    <span className="text-sm font-bold text-primary">{cycleLength} days</span>
                  </div>
                  <input type="range" min={21} max={35} value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-dark/30 mt-1"><span>21</span><span>28</span><span>35</span></div>
                </div>

                {/* Period length */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-dark">Period length</label>
                    <span className="text-sm font-bold" style={{ color: "#F87171" }}>{periodLength} days</span>
                  </div>
                  <input type="range" min={2} max={8} value={periodLength}
                    onChange={(e) => setPeriodLength(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-dark/30 mt-1"><span>2</span><span>5</span><span>8</span></div>
                </div>

                {/* Ovulation window */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <label className="text-sm font-semibold text-dark">Ovulation window</label>
                      <p className="text-xs text-dark/40 font-body">Days around peak fertility</p>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "#FBBF24" }}>{ovulationLength} days</span>
                  </div>
                  <input type="range" min={1} max={5} value={ovulationLength}
                    onChange={(e) => setOvulationLength(Number(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-dark/30 mt-1"><span>1</span><span>3</span><span>5</span></div>
                </div>

                {/* Live phase preview */}
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  {[
                    { label: "🌙 Menstrual",  days: `${periodLength}d`,         note: "your period",        color: "#F87171" },
                    { label: "🌱 Follicular", days: `~${folLen}d`,              note: "auto",               color: "#34D399" },
                    { label: "⚡ Ovulation",  days: `${ovulationLength}d`,      note: "your window",        color: "#FBBF24" },
                    { label: "🍂 Luteal",     days: `~${lutLen}d`,              note: "auto",               color: "#A78BFA" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                        <span className="text-xs font-semibold text-dark">{p.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: p.color }}>{p.days}</span>
                        <span className="text-xs text-dark/25">{p.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Goals */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">My goals</p>
          <div className="flex flex-wrap gap-2">
            {goals.map((g) => {
              const active = selectedGoals.includes(g);
              return (
                <button key={g} onClick={() => toggleGoal(g)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                  style={{ background: active ? "rgba(196,138,151,0.15)" : "#F9FAFB", color: active ? "#C48A97" : "#6B7280", border: `1px solid ${active ? "rgba(196,138,151,0.4)" : "transparent"}` }}>
                  {active ? "✓ " : ""}{g}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MACRO CALCULATOR ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card mb-3 overflow-hidden">
          {/* Header — tap to expand */}
          <button
            onClick={() => setShowCalc(!showCalc)}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                🧮
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-dark">Calculate My Macros</p>
                <p className="text-xs text-dark/40 font-body">
                  {calcSaved && macroResult
                    ? `${macroResult.targetCalories} kcal · ${macroResult.protein}g P · ${macroResult.carbs}g C · ${macroResult.fats}g F`
                    : "Height, weight, age & goal"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {calcSaved && <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Saved</span>}
              <span className="text-dark/30 text-lg">{showCalc ? "↑" : "↓"}</span>
            </div>
          </button>

          {showCalc && (
            <div className="px-4 pb-5 border-t border-gray-50">
              <p className="text-xs text-dark/40 font-body mt-3 mb-4">
                Uses the Mifflin-St Jeor formula — the most accurate for women.
              </p>

              {/* Body metrics inputs */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-1.5">Height</label>
                  <div className="relative">
                    <input type="number" placeholder="170" value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors pr-8"
                      min="100" max="250" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark/30 font-semibold">cm</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-1.5">Weight</label>
                  <div className="relative">
                    <input type="number" placeholder="65" value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors pr-8"
                      min="30" max="300" step="0.1" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark/30 font-semibold">kg</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-1.5">Age</label>
                  <div className="relative">
                    <input type="number" placeholder="28" value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors pr-8"
                      min="13" max="100" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark/30 font-semibold">yr</span>
                  </div>
                </div>
              </div>

              {/* Activity level */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Activity level</label>
                <div className="space-y-1.5">
                  {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setActivityLevel(key)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-98"
                      style={{
                        background: activityLevel === key ? "rgba(196,138,151,0.12)" : "#F9FAFB",
                        border: `1.5px solid ${activityLevel === key ? "rgba(196,138,151,0.35)" : "transparent"}`,
                      }}>
                      <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: activityLevel === key ? "#C48A97" : "#D1D5DB" }}>
                        {activityLevel === key && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </span>
                      <span className="text-xs font-medium" style={{ color: activityLevel === key ? "#C48A97" : "#6B7280" }}>
                        {label}
                      </span>
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
                      style={{
                        background: bodyGoal === key ? "rgba(196,138,151,0.12)" : "#F9FAFB",
                        border: `1.5px solid ${bodyGoal === key ? "rgba(196,138,151,0.35)" : "transparent"}`,
                      }}>
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: bodyGoal === key ? "#C48A97" : "#374151" }}>{g.label}</span>
                      <span className="text-xs text-center leading-tight" style={{ color: bodyGoal === key ? "#C48A97" : "#9CA3AF" }}>{g.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate button */}
              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 mb-4"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                Calculate 🧮
              </button>

              {/* Results */}
              {macroResult && (
                <div>
                  <div className="rounded-2xl overflow-hidden mb-3"
                    style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-white/50 text-xs uppercase tracking-wide font-semibold">Daily target</p>
                          <p className="text-white font-display font-bold text-3xl">{macroResult.targetCalories}</p>
                          <p className="text-white/40 text-xs font-body">kcal / day</p>
                        </div>
                        <div className="text-right">
                          {macroResult.bmr > 0 && (
                            <>
                              <p className="text-white/40 text-xs font-body">BMR: {macroResult.bmr} kcal</p>
                              <p className="text-white/40 text-xs font-body">TDEE: {macroResult.tdee} kcal</p>
                              {macroResult.deficit && <p className="text-rose-300 text-xs font-semibold">−{macroResult.deficit} kcal deficit</p>}
                              {macroResult.surplus && <p className="text-emerald-300 text-xs font-semibold">+{macroResult.surplus} kcal surplus</p>}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Macro breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Protein", value: macroResult.protein, color: "#C48A97", note: "Muscle & satiety" },
                          { label: "Carbs",   value: macroResult.carbs,   color: "#EDD5DB", note: "Energy & training" },
                          { label: "Fats",    value: macroResult.fats,    color: "#A78BFA", note: "Hormones & health" },
                        ].map((m) => (
                          <div key={m.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                            <p className="font-display font-bold text-xl text-white">{m.value}g</p>
                            <p className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: m.color }}>{m.label}</p>
                            <p className="text-white/30 text-xs font-body mt-0.5">{m.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Macro ratio bar */}
                  <div className="mb-3">
                    {(() => {
                      const total = macroResult.protein * 4 + macroResult.carbs * 4 + macroResult.fats * 9;
                      const pPct = Math.round((macroResult.protein * 4 / total) * 100);
                      const cPct = Math.round((macroResult.carbs * 4 / total) * 100);
                      const fPct = 100 - pPct - cPct;
                      return (
                        <div>
                          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-1.5">
                            <div style={{ width: `${pPct}%`, background: "#C48A97" }} className="rounded-l-full" />
                            <div style={{ width: `${cPct}%`, background: "#EDD5DB" }} />
                            <div style={{ width: `${fPct}%`, background: "#A78BFA" }} className="rounded-r-full" />
                          </div>
                          <div className="flex justify-between text-xs text-dark/40 font-semibold">
                            <span>P {pPct}%</span>
                            <span>C {cPct}%</span>
                            <span>F {fPct}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <button onClick={handleSaveMacros}
                    className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: calcSaved ? "rgba(52,211,153,0.1)" : "rgba(196,138,151,0.1)",
                      color: calcSaved ? "#059669" : "#C48A97",
                      border: `1.5px solid ${calcSaved ? "rgba(52,211,153,0.3)" : "rgba(196,138,151,0.3)"}`,
                    }}>
                    {calcSaved ? "✓ Macros saved to profile" : "Save macros to profile"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weight tracker link */}
        <button
          onClick={() => router.push("/weight")}
          className="w-full bg-white rounded-2xl px-4 py-4 shadow-card mb-3 flex items-center gap-3 transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7B6D8D, #C48A97)" }}>
            ⚖️
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-dark">Weight Progress Tracker</p>
            <p className="text-xs text-dark/40 font-body">Log daily weight and see your trend</p>
          </div>
          <span className="text-dark/30 text-lg">→</span>
        </button>

        {/* PR tracker link */}
        <button
          onClick={() => router.push("/prs")}
          className="w-full bg-white rounded-2xl px-4 py-4 shadow-card mb-3 flex items-center gap-3 transition-all active:scale-95"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
            🏆
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-dark">Personal Records</p>
            <p className="text-xs text-dark/40 font-body">Track your strongest lifts by phase</p>
          </div>
          <span className="text-dark/30 text-lg">→</span>
        </button>

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-4">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Preferences</p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-dark">Weight units</p>
              <p className="text-xs text-dark/40 font-body">Used in training log</p>
            </div>
            <div className="flex rounded-xl overflow-hidden border border-gray-100">
              {(["kg", "lbs"] as const).map((u) => (
                <button key={u} onClick={() => setUnits(u)}
                  className="px-4 py-1.5 text-sm font-semibold transition-all"
                  style={{ background: units === u ? "#C48A97" : "transparent", color: units === u ? "white" : "#9CA3AF" }}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-dark">Daily reminders</p>
              <p className="text-xs text-dark/40 font-body">
                {!push.isSupported
                  ? "Install HerPhase as PWA to enable"
                  : push.isSubscribed
                  ? "You'll get daily check-in reminders"
                  : "Get reminded to log your daily check-in"}
              </p>
            </div>
            {push.isSupported ? (
              <button
                onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
                disabled={push.loading}
                className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
                style={{ background: push.isSubscribed ? "#C48A97" : "#E5E7EB" }}>
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300"
                  style={{ left: push.isSubscribed ? "calc(100% - 1.375rem)" : "0.125rem" }} />
              </button>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(196,138,151,0.1)", color: "#C48A97" }}>
                PWA only
              </span>
            )}
          </div>
        </div>

        {/* Save profile */}
        <button onClick={handleSave} disabled={saveStatus === "loading"}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 shadow-soft mb-3 disabled:opacity-50"
          style={{ background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)" : saveStatus === "error" ? "linear-gradient(135deg, #F87171, #EF4444)" : "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
          {saveStatus === "loading" ? "Saving…" : saveStatus === "success" ? "✓ Profile Saved!" : saveStatus === "error" ? "✗ Error — Retry" : "Save Profile"}
        </button>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "View History", emoji: "📋", href: "/history" },
            { label: "Weight Tracker", emoji: "⚖️", href: "/weight" },
          ].map(link => (
            <button key={link.href} onClick={() => router.push(link.href)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-dark/60 bg-white shadow-card active:scale-95 transition-all">
              <span style={{ fontSize: 16 }}>{link.emoji}</span>
              {link.label}
            </button>
          ))}
        </div>

        {/* Feedback button */}
        <a href="mailto:wwealth989@gmail.com?subject=HerPhase Feedback&body=Hi! Here's my feedback on HerPhase:%0A%0AWhat I love:%0A%0AWhat confused me:%0A%0AWhat's missing:%0A%0AWhat I'd pay for:%0A"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold mb-3 transition-all active:scale-95"
          style={{ background: "rgba(196,138,151,0.1)", color: "#C48A97", border: "1.5px solid rgba(196,138,151,0.25)" }}>
          <span style={{ fontSize: 16 }}>💌</span>
          Send feedback
        </a>

        <p className="text-center text-xs text-dark/25 mt-2 mb-2 font-body">HerPhase v0.2.0</p>
      </main>
    </div>
  );
}
