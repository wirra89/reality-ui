"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/profile/page.tsx
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { saveProfile, signOut, supabase } from "@/lib/supabase";
import {
  calculateMacros, GOAL_LABELS,
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

const GOALS = [
  "Build muscle", "Lose fat", "Improve endurance",
  "Reduce PMS symptoms", "Better sleep", "More energy",
];

// Short labels for the activity chip selector
const ACTIVITY_SHORT: Record<ActivityLevel, string> = {
  sedentary:   "Sedentary",
  light:       "Light",
  moderate:    "Moderate",
  active:      "Active",
  very_active: "Very Active",
};

export default function ProfilePage() {
  const { user, profile, refreshProfile, loading, setPeriodStartToday } = useApp();
  const router = useRouter();
  usePushNotifications(user?.id ?? null);

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName]                 = useState("Ana");
  const [cycleLength, setCycleLength]   = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [ovulationLength, setOvulationLength] = useState(3);
  const [avatarIndex, setAvatarIndex]   = useState(0);
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [units, setUnits]               = useState<"kg" | "lbs">("kg");
  const [notifications, setNotifications] = useState(true);
  const [saveStatus, setSaveStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [toast, setToast]               = useState<string | null>(null);

  // ── Macro calculator state ─────────────────────────────────────────────────
  const [showCalc, setShowCalc]               = useState(false);
  const [showCycleAccordion, setShowCycleAccordion] = useState(false);
  const [showAdvancedOvulation, setShowAdvancedOvulation] = useState(false);
  const [showMacroDetails, setShowMacroDetails] = useState(false);
  const [heightCm, setHeightCm]           = useState("");
  const [weightKg, setWeightKg]           = useState("");
  const [age, setAge]                     = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [bodyGoal, setBodyGoal]           = useState<BodyGoal>("recomposition");
  const [macroResult, setMacroResult]     = useState<ReturnType<typeof calculateMacros> | null>(null);
  const [calcSaved, setCalcSaved]         = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/auth"); }, [user, loading, router]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "Ana");
    setCycleLength(profile.cycle_length ?? 28);
    setPeriodLength(profile.period_length ?? 5);
    setOvulationLength(profile.ovulation_length ?? 3);
    setAvatarIndex(profile.avatar_index ?? 0);
    setAvatarUrl(profile.avatar_url ?? null);
    setSelectedGoals(profile.goals ?? []);
    setUnits(profile.units ?? "kg");
    setNotifications(profile.notifications ?? true);
    if (profile.height_cm)    setHeightCm(String(profile.height_cm));
    if (profile.weight_kg)    setWeightKg(String(profile.weight_kg));
    if (profile.age)          setAge(String(profile.age));
    if (profile.activity_level) setActivityLevel(profile.activity_level as ActivityLevel);
    if (profile.body_goal)    setBodyGoal(profile.body_goal as BodyGoal);
    if (profile.calculated_calories) {
      setMacroResult({
        bmr: 0, tdee: 0,
        targetCalories: profile.calculated_calories,
        protein: profile.calculated_protein ?? 0,
        carbs:   profile.calculated_carbs   ?? 0,
        fats:    profile.calculated_fats    ?? 0,
      });
      setCalcSaved(true);
    }
  }, [profile]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith("image/")) return;
    setAvatarUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
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

  // Single save — includes macro data if calculated and not yet saved
  async function handleSave() {
    setSaveStatus("loading");
    const result = await saveProfile({
      name, cycle_length: cycleLength, period_length: periodLength,
      ovulation_length: ovulationLength, avatar_index: avatarIndex,
      goals: selectedGoals, units, notifications,
      cycle_day: profile?.cycle_day ?? 1,
    });

    if (result.success && macroResult && !calcSaved) {
      const h = parseFloat(heightCm);
      const w = parseFloat(weightKg);
      const a = parseInt(age);
      if (h && w && a) {
        await saveProfile({
          height_cm: h, weight_kg: w, age: a,
          activity_level: activityLevel, body_goal: bodyGoal,
          calculated_calories: macroResult.targetCalories,
          calculated_protein:  macroResult.protein,
          calculated_carbs:    macroResult.carbs,
          calculated_fats:     macroResult.fats,
        });
        setCalcSaved(true);
      }
    }

    if (result.success) {
      if (user && (cycleLength !== profile?.cycle_length || periodLength !== profile?.period_length)) {
        await supabase
          .from("user_cycle_history")
          .update({ cycle_length_at_start: cycleLength, period_length_at_start: periodLength })
          .eq("user_id", user.id)
          .eq("id",
            supabase.from("user_cycle_history").select("id")
              .eq("user_id", user.id)
              .order("cycle_start_date", { ascending: false })
              .limit(1)
          );
      }
      await refreshProfile();
      setSaveStatus("success");
    } else {
      setSaveStatus("error");
    }
    setTimeout(() => setSaveStatus("idle"), 2500);
  }

  function handleCalculate() {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    const a = parseInt(age);
    if (!h || !w || !a || h < 100 || h > 250 || w < 30 || w > 300 || a < 13 || a > 100) return;
    setMacroResult(calculateMacros({ heightCm: h, weightKg: w, age: a, activityLevel, bodyGoal }));
    setCalcSaved(false);
  }

  async function handleLogout() {
    await signOut();
    router.replace("/auth");
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function confirmPeriodStart() {
    setShowPeriodModal(false);
    await setPeriodStartToday();
    showToast("Cycle reset to Day 1");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setShowPeriodModal(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const canCalculate = !!(heightCm && weightKg && age &&
    parseFloat(heightCm) > 0 && parseFloat(weightKg) > 0 && parseInt(age) > 0);

  // ── Profile completeness ───────────────────────────────────────────────────
  const completenessItems = [
    { label: "Goals",        done: selectedGoals.length > 0 },
    { label: "Body metrics", done: !!(heightCm && weightKg && age) },
    { label: "Period date",  done: !!profile?.period_start_date },
    { label: "Macros",       done: calcSaved },
  ];
  const completeCount = completenessItems.filter(i => i.done).length;
  const isComplete    = completeCount === completenessItems.length;

  // Last updated — period start date formatted
  const periodUpdated = profile?.period_start_date
    ? new Date(profile.period_start_date + "T00:00:00")
        .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  // Cycle phase preview (live, recomputed on slider change)
  const ovEnd  = Math.round(cycleLength / 2) - Math.floor(ovulationLength / 2) + ovulationLength - 1;
  const folEnd = Math.round(cycleLength / 2) - Math.floor(ovulationLength / 2) - 1;
  const folLen = Math.max(1, folEnd - periodLength);
  const lutLen = Math.max(1, cycleLength - ovEnd);

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #34D399, #10B981)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Confirmation modal — period reset */}
      {showPeriodModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowPeriodModal(false)}>
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            style={{ background: "#FFFFFF" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                style={{ background: "rgba(248,113,113,0.1)" }}>
                🩸
              </div>
            </div>

            {/* Copy */}
            <h2 className="font-display text-xl font-semibold text-dark text-center mb-2">
              Start new cycle?
            </h2>
            <p className="text-sm text-dark/55 font-body text-center leading-relaxed mb-1">
              This will reset your cycle to Day 1 based on today.
            </p>
            <p className="text-xs text-dark/35 font-body text-center mb-6">
              You can change this later in settings.
            </p>

            {/* Actions */}
            <button
              onClick={confirmPeriodStart}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mb-2.5 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #F87171, #C48A97)" }}>
              Yes, start cycle
            </button>
            <button
              onClick={() => setShowPeriodModal(false)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(0,0,0,0.04)", color: "#6B7280" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-12">

        {/* Header — sign out removed from here, now in Account section */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Settings</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Profile</h1>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════
            Section 1 — Identity
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-card mb-3 flex flex-col items-center">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full overflow-hidden shadow-soft flex items-center justify-center"
              style={{ background: avatarUrl ? "transparent" : avatarColors[avatarIndex] }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-white text-4xl font-display font-bold">{name.charAt(0).toUpperCase() || "?"}</span>
              }
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-soft transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>

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
            className="text-center text-dark font-display font-semibold text-xl outline-none bg-transparent w-full"
            placeholder="Your name" />
          <p className="text-dark/40 text-xs font-body mt-1">
            {avatarUrl ? "Tap camera icon to change photo" : "Add a photo"}
          </p>

          {/* Profile completeness — hidden when all done */}
          {!isComplete && (
            <div className="w-full mt-4 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-dark/50">Profile completeness</p>
                <p className="text-xs font-bold text-primary">{completeCount} of {completenessItems.length}</p>
              </div>
              <div className="flex gap-1 mb-2">
                {completenessItems.map((item, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500"
                    style={{ background: item.done ? "#C48A97" : "rgba(0,0,0,0.08)" }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {completenessItems.filter(i => !i.done).map(item => (
                  <p key={item.label} className="text-xs text-dark/35 font-body">· {item.label}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            Section 2 — Cycle
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-card mb-2 overflow-hidden">
          <button
            onClick={() => setShowCycleAccordion(v => !v)}
            className="w-full flex items-center justify-between px-4 py-4 transition-all"
            style={{ background: showCycleAccordion ? "rgba(196,138,151,0.06)" : "transparent" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background: "rgba(196,138,151,0.1)" }}>🩸</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-dark">Cycle settings</p>
                <p className="text-xs text-dark/40 font-body mt-0.5">
                  {cycleLength}d cycle · {periodLength}d period
                </p>
                {periodUpdated && (
                  <p className="text-xs text-dark/25 font-body mt-0.5">Last updated {periodUpdated}</p>
                )}
              </div>
            </div>
            <span className="text-dark/30 text-sm transition-transform duration-200"
              style={{ transform: showCycleAccordion ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
          </button>

          {showCycleAccordion && (
            <div className="px-4 pb-4 border-t border-gray-100 space-y-5 pt-4">
              {/* Cycle length */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-dark">Cycle length</label>
                  <span className="text-sm font-bold text-primary">{cycleLength} days</span>
                </div>
                <input type="range" min={21} max={35} value={cycleLength}
                  onChange={(e) => setCycleLength(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-dark/30 mt-1">
                  <span>21</span><span>28</span><span>35</span>
                </div>
              </div>

              {/* Period length */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-dark">Period length</label>
                  <span className="text-sm font-bold" style={{ color: "#F87171" }}>{periodLength} days</span>
                </div>
                <input type="range" min={2} max={8} value={periodLength}
                  onChange={(e) => setPeriodLength(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs text-dark/30 mt-1">
                  <span>2</span><span>5</span><span>8</span>
                </div>
              </div>

              {/* Advanced — ovulation window (hidden by default) */}
              <div>
                <button
                  onClick={() => setShowAdvancedOvulation(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-dark/35 mb-3">
                  <span style={{ transform: showAdvancedOvulation ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▶</span>
                  Advanced
                </button>
                {showAdvancedOvulation && (
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
                    <div className="flex justify-between text-xs text-dark/30 mt-1">
                      <span>1</span><span>3</span><span>5</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Live phase preview */}
              <div className="rounded-xl overflow-hidden border border-gray-100">
                {[
                  { label: "🌙 Menstrual",  days: `${periodLength}d`,    note: "your period",  color: "#F87171" },
                  { label: "🌱 Follicular", days: `~${folLen}d`,         note: "auto",         color: "#34D399" },
                  { label: "⚡ Ovulation",  days: `${ovulationLength}d`, note: "your window",  color: "#FBBF24" },
                  { label: "🍂 Luteal",     days: `~${lutLen}d`,         note: "auto",         color: "#A78BFA" },
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
          )}
        </div>

        {/* Period reset — opens confirmation modal */}
        <button
          onClick={() => setShowPeriodModal(true)}
          className="w-full mb-3 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: "rgba(248,113,113,0.08)", color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}>
          <span>🩸</span>
          My period started today
        </button>

        {/* ════════════════════════════════════════════════════
            Section 3 — Goals
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">My goals</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const active = selectedGoals.includes(g);
              return (
                <button key={g} onClick={() => toggleGoal(g)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                  style={{
                    background: active ? "rgba(196,138,151,0.15)" : "#F9FAFB",
                    color:      active ? "#C48A97" : "#6B7280",
                    border:     `1px solid ${active ? "rgba(196,138,151,0.4)" : "transparent"}`,
                  }}>
                  {active ? "✓ " : ""}{g}
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            Section 4 — Nutrition / Macros
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-card mb-3 overflow-hidden">
          <button
            onClick={() => setShowCalc(!showCalc)}
            className="w-full px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                🧮
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-dark">Macro Targets</p>
                <p className="text-xs text-dark/40 font-body">
                  {calcSaved && macroResult
                    ? `${macroResult.targetCalories} kcal · ${macroResult.protein}g P · ${macroResult.carbs}g C · ${macroResult.fats}g F`
                    : "Height, weight, age & activity"}
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

              {/* Body metrics */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {([
                  { label: "Height", value: heightCm, set: setHeightCm, placeholder: "170", unit: "cm", min: 100, max: 250 },
                  { label: "Weight", value: weightKg, set: setWeightKg, placeholder: "65",  unit: "kg", min: 30,  max: 300 },
                  { label: "Age",    value: age,      set: setAge,      placeholder: "28",  unit: "yr", min: 13,  max: 100 },
                ] as const).map(f => (
                  <div key={f.label}>
                    <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-1.5">{f.label}</label>
                    <div className="relative">
                      <input type="number" placeholder={f.placeholder} value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors pr-8"
                        min={f.min} max={f.max} />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark/30 font-semibold">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Activity level — compact chip row */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Activity level</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(ACTIVITY_SHORT) as [ActivityLevel, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setActivityLevel(key)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: activityLevel === key ? "rgba(196,138,151,0.15)" : "#F9FAFB",
                        color:      activityLevel === key ? "#C48A97" : "#6B7280",
                        border:     `1px solid ${activityLevel === key ? "rgba(196,138,151,0.4)" : "transparent"}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body goal — compact 3-column, descriptions removed */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Body goal</label>
                <div className="flex gap-2">
                  {(Object.entries(GOAL_LABELS) as [BodyGoal, typeof GOAL_LABELS[BodyGoal]][]).map(([key, g]) => (
                    <button key={key} onClick={() => setBodyGoal(key)}
                      className="flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl transition-all active:scale-95"
                      style={{
                        background: bodyGoal === key ? "rgba(196,138,151,0.12)" : "#F9FAFB",
                        border:     `1.5px solid ${bodyGoal === key ? "rgba(196,138,151,0.35)" : "transparent"}`,
                      }}>
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: bodyGoal === key ? "#C48A97" : "#374151" }}>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculate */}
              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 mb-4"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                Calculate targets
              </button>

              {/* Results — BMR/TDEE removed, only kcal + macros */}
              {macroResult && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)" }}>
                  <div className="p-4">
                    <div className="mb-3">
                      <p className="text-white/50 text-xs uppercase tracking-wide font-semibold">Daily target</p>
                      <p className="text-white font-display font-bold text-3xl">{macroResult.targetCalories}</p>
                      <p className="text-white/40 text-xs font-body">kcal / day</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: "Protein", value: macroResult.protein, color: "#C48A97" },
                        { label: "Carbs",   value: macroResult.carbs,   color: "#EDD5DB" },
                        { label: "Fats",    value: macroResult.fats,    color: "#A78BFA" },
                      ].map((m) => (
                        <div key={m.label} className="bg-white/5 rounded-xl p-2.5 text-center">
                          <p className="font-display font-bold text-xl text-white">{m.value}g</p>
                          <p className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: m.color }}>{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Details — macro ratio bar (collapsed by default) */}
                    <button
                      onClick={() => setShowMacroDetails(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-white/40 font-semibold mb-2">
                      <span style={{ transform: showMacroDetails ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▶</span>
                      Details
                    </button>
                    {showMacroDetails && (() => {
                      const total = macroResult.protein * 4 + macroResult.carbs * 4 + macroResult.fats * 9;
                      const pPct  = Math.round((macroResult.protein * 4 / total) * 100);
                      const cPct  = Math.round((macroResult.carbs   * 4 / total) * 100);
                      const fPct  = 100 - pPct - cPct;
                      return (
                        <div>
                          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 mb-1.5">
                            <div style={{ width: `${pPct}%`, background: "#C48A97" }} className="rounded-l-full" />
                            <div style={{ width: `${cPct}%`, background: "#EDD5DB" }} />
                            <div style={{ width: `${fPct}%`, background: "#A78BFA" }} className="rounded-r-full" />
                          </div>
                          <div className="flex justify-between text-xs text-white/40 font-semibold">
                            <span>P {pPct}%</span><span>C {cPct}%</span><span>F {fPct}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Hint to use main Save button */}
              {macroResult && !calcSaved && (
                <p className="text-center text-xs text-dark/40 font-body mt-3">
                  Tap <strong>Save changes</strong> below to apply these targets.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            Section 5 — Preferences
        ════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Preferences</p>

          {/* Weight units */}
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

          {/* Notifications toggle — was in state but never rendered */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-dark">Notifications</p>
              <p className="text-xs text-dark/40 font-body">Daily reminders & insights</p>
            </div>
            <button
              onClick={() => setNotifications(v => !v)}
              className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
              style={{ background: notifications ? "#C48A97" : "#E5E7EB" }}>
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300"
                style={{ left: notifications ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            Save — single CTA, merges profile + macro saves
        ════════════════════════════════════════════════════ */}
        <button onClick={handleSave} disabled={saveStatus === "loading"}
          className="w-full py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 shadow-soft mb-3 disabled:opacity-50"
          style={{
            background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)"
              : saveStatus === "error"   ? "linear-gradient(135deg, #F87171, #EF4444)"
              : "linear-gradient(135deg, #C48A97, #7B6D8D)",
          }}>
          {saveStatus === "loading" ? "Saving…"
            : saveStatus === "success" ? "✓ Saved!"
            : saveStatus === "error"   ? "✗ Error — Retry"
            : "Save changes"}
        </button>

        {/* ════════════════════════════════════════════════════
            Section 6 — My Data
        ════════════════════════════════════════════════════ */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2 px-1">My data</p>
          {[
            { label: "Weight Tracker",   sub: "Log daily weight and see your trend", emoji: "⚖️", href: "/weight",  bg: "linear-gradient(135deg, #7B6D8D, #C48A97)" },
            { label: "Personal Records", sub: "Track your strongest lifts by phase",  emoji: "🏆", href: "/prs",     bg: "linear-gradient(135deg, #C48A97, #7B6D8D)" },
            { label: "Training History", sub: "All your past workouts",               emoji: "📋", href: "/history", bg: "linear-gradient(135deg, #A78BFA, #7B6D8D)" },
          ].map(item => (
            <button key={item.href} onClick={() => router.push(item.href)}
              className="w-full bg-white rounded-2xl px-4 py-4 shadow-card mb-2 flex items-center gap-3 transition-all active:scale-95">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: item.bg }}>{item.emoji}</div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-dark">{item.label}</p>
                <p className="text-xs text-dark/40 font-body">{item.sub}</p>
              </div>
              <span className="text-dark/30 text-lg">→</span>
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            Section 7 — Account
            Sign out moved here from header (was too easy to tap accidentally)
        ════════════════════════════════════════════════════ */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2 px-1">Account</p>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-xs text-dark/40 font-body">Signed in as</p>
              <p className="text-sm font-medium text-dark truncate">{user.email}</p>
            </div>
            <a href="mailto:wwealth989@gmail.com?subject=HerPhase Feedback&body=Hi! Here's my feedback on HerPhase:%0A%0AWhat I love:%0A%0AWhat confused me:%0A%0AWhat's missing:%0A%0AWhat I'd pay for:%0A"
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 transition-all active:scale-98">
              <span className="text-base">💌</span>
              <span className="text-sm font-semibold text-dark">Send feedback</span>
            </a>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:scale-98">
              <span className="text-base text-rose-400">↪</span>
              <span className="text-sm font-semibold text-rose-400">Sign out</span>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
