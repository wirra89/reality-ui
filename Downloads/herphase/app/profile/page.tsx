"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/profile/page.tsx
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { saveProfile, signOut, supabase, getCheckinStreak } from "@/lib/supabase";
import { getPhaseData } from "@/lib/cycle";
import {
  calculateMacros, GOAL_LABELS,
  type ActivityLevel, type BodyGoal,
} from "@/lib/macros";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getBestPRPerExercise, type PersonalRecord } from "@/lib/supabase";
import { getProgressPhotos, type ProgressPhoto } from "@/lib/progressPhotos";
import { computeAchievements, type AchievementDef, type AchievementCounts } from "@/lib/achievements";
import TopLiftsCard from "@/components/TopLiftsCard";
import ProgressPhotosCard from "@/components/ProgressPhotosCard";
import AchievementsCard from "@/components/AchievementsCard";
import ProgressTimeline from "@/components/ProgressTimeline";

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

const ACTIVITY_SHORT: Record<ActivityLevel, string> = {
  sedentary:   "Sedentary",
  light:       "Light",
  moderate:    "Moderate",
  active:      "Active",
  very_active: "Very Active",
};

const ACTIVITY_DESC: Record<ActivityLevel, string> = {
  sedentary:   "Desk job, little movement",
  light:       "1–3 workouts per week",
  moderate:    "3–5 workouts per week",
  active:      "6–7 workouts per week",
  very_active: "Twice/day or physical job",
};

const PHASE_COLOR: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

const PHASE_LABEL: Record<string, string> = {
  menstrual:  "Menstrual",
  follicular: "Follicular",
  ovulation:  "Ovulation",
  luteal:     "Luteal",
};

export default function ProfilePage() {
  const { user, profile, refreshProfile, loading, setPeriodStartToday, cycleDay, cycleParams } = useApp();
  const router = useRouter();
  usePushNotifications(user?.id ?? null);

  const phaseData  = getPhaseData(cycleDay, cycleParams);
  const phase      = phaseData.phase;
  const phaseColor = PHASE_COLOR[phase] ?? "#C48A97";

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName]                       = useState("");
  const [cycleLength, setCycleLength]         = useState(28);
  const [periodLength, setPeriodLength]       = useState(5);
  const [ovulationLength, setOvulationLength] = useState(3);
  const [avatarIndex, setAvatarIndex]         = useState(0);
  const [avatarUrl, setAvatarUrl]             = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedGoals, setSelectedGoals]     = useState<string[]>([]);
  const [units, setUnits]                     = useState<"kg" | "lbs">("kg");
  const [notifications, setNotifications]     = useState(true);
  const [saveStatus, setSaveStatus]           = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [toast, setToast]                     = useState<string | null>(null);
  // dirty flag — set true on any field change, cleared after successful save
  const [dirty, setDirty]                     = useState(false);

  // ── Macro calculator state ─────────────────────────────────────────────────
  const [showCalc, setShowCalc]                         = useState(false);
  const [showCycleAccordion, setShowCycleAccordion]     = useState(false);
  const [showAdvancedOvulation, setShowAdvancedOvulation] = useState(false);
  const [showMacroDetails, setShowMacroDetails]         = useState(false);
  const [heightCm, setHeightCm]                         = useState("");
  const [weightKg, setWeightKg]                         = useState("");
  const [age, setAge]                                   = useState("");
  const [activityLevel, setActivityLevel]               = useState<ActivityLevel>("moderate");
  const [bodyGoal, setBodyGoal]                         = useState<BodyGoal>("recomposition");
  const [macroResult, setMacroResult]                   = useState<ReturnType<typeof calculateMacros> | null>(null);
  const [calcSaved, setCalcSaved]                       = useState(false);

  // ── Data counts for My Data section ───────────────────────────────────────
  const [streak, setStreak]             = useState(0);
  const [weightCount, setWeightCount]   = useState<number | null>(null);
  const [prCount, setPrCount]           = useState<number | null>(null);
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);

  // ── New profile additions ─────────────────────────────────────────────────
  const [weightDelta, setWeightDelta]       = useState<{ latest: number; delta: number } | null>(null);
  const [topPrs, setTopPrs]                 = useState<PersonalRecord[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [achievements, setAchievements]     = useState<AchievementDef[]>([]);
  const [showTimeline, setShowTimeline]     = useState(false);

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
    if (profile.height_cm)      setHeightCm(String(profile.height_cm));
    if (profile.weight_kg)      setWeightKg(String(profile.weight_kg));
    if (profile.age)            setAge(String(profile.age));
    if (profile.activity_level) setActivityLevel(profile.activity_level as ActivityLevel);
    if (profile.body_goal)      setBodyGoal(profile.body_goal as BodyGoal);
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
    setDirty(false);
  }, [profile]);

  // Fetch streak + data counts (one-time on mount)
  useEffect(() => {
    if (!user) return;
    getCheckinStreak().then(setStreak);
    supabase.from("weight_logs").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).then(({ count }) => setWeightCount(count ?? 0));
    supabase.from("personal_records").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).then(({ count }) => setPrCount(count ?? 0));
    supabase.from("workouts").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).then(({ count }) => setWorkoutCount(count ?? 0));

    // Weight delta for hero trend row
    supabase.from("weight_logs").select("weight_kg,date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (data && data.length === 2) {
          setWeightDelta({
            latest: data[0].weight_kg,
            delta: +(data[0].weight_kg - data[1].weight_kg).toFixed(1),
          });
        }
      });

    // Top lifts
    getBestPRPerExercise().then(setTopPrs);

    // Progress photos
    getProgressPhotos().then(setProgressPhotos);

    // Achievement counts
    Promise.all([
      supabase.from("workouts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("meal_log_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("personal_records").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("weight_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("personal_records").select("exercise").eq("user_id", user.id),
      supabase.from("mood_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      getProgressPhotos(),
      supabase.from("meal_log_entries").select("date, meal_type").eq("user_id", user.id),
    ]).then(([workoutsRes, mealsRes, prsRes, weightRes, exercisesRes, moodRes, photos, mealTypesRes]) => {
      const uniqueExercises = new Set(
        (exercisesRes.data ?? []).map((r: { exercise: string }) => r.exercise.toLowerCase())
      ).size;

      // Check if any single day has all 4 meal types logged
      const byDate = new Map<string, Set<string>>();
      for (const row of (mealTypesRes.data ?? []) as { date: string; meal_type: string }[]) {
        if (!byDate.has(row.date)) byDate.set(row.date, new Set());
        byDate.get(row.date)!.add(row.meal_type);
      }
      const allMealTypesDay = [...byDate.values()].some(
        (types) => types.has("breakfast") && types.has("lunch") && types.has("dinner") && types.has("snack")
      );

      const counts: AchievementCounts = {
        workouts:        workoutsRes.count  ?? 0,
        meals:           mealsRes.count     ?? 0,
        prs:             prsRes.count       ?? 0,
        weightLogs:      weightRes.count    ?? 0,
        uniqueExercises,
        streak:          0,
        moodLogs:        moodRes.count      ?? 0,
        progressPhotos:  (photos as import("@/lib/progressPhotos").ProgressPhoto[]).length,
        allMealTypesDay,
      };
      getCheckinStreak().then((s) => {
        setAchievements(computeAchievements({ ...counts, streak: s }));
      });
    });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setDirty(true);
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
        const { data: latestRow } = await supabase
          .from("user_cycle_history")
          .select("id")
          .eq("user_id", user.id)
          .order("cycle_start_date", { ascending: false })
          .limit(1)
          .single();
        if (latestRow?.id) {
          await supabase
            .from("user_cycle_history")
            .update({ cycle_length_at_start: cycleLength, period_length_at_start: periodLength })
            .eq("id", latestRow.id);
        }
      }
      await refreshProfile();
      setSaveStatus("success");
      setDirty(false);
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
    setDirty(true);
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
  const completeCount   = completenessItems.filter(i => i.done).length;
  const isComplete      = completeCount === completenessItems.length;
  const firstMissing    = completenessItems.find(i => !i.done);

  // Contextual nudge copy — specific to what's missing
  const completenessNudge: Record<string, string> = {
    "Goals":        "Add your goals to personalise training and nutrition",
    "Body metrics": "Add height, weight & age to unlock macro targets",
    "Period date":  "Set your period date to enable accurate phase tracking",
    "Macros":       "Calculate macros to get personalised daily targets",
  };

  // Last updated — period start date formatted
  const periodUpdated = profile?.period_start_date
    ? new Date(profile.period_start_date + "T00:00:00")
        .toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  // Member since — from user created_at
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : null;

  // Cycle phase preview
  const ovEnd  = Math.round(cycleLength / 2) - Math.floor(ovulationLength / 2) + ovulationLength - 1;
  const folEnd = Math.round(cycleLength / 2) - Math.floor(ovulationLength / 2) - 1;
  const folLen = Math.max(1, folEnd - periodLength);
  const lutLen = Math.max(1, cycleLength - ovEnd);

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl text-sm font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #34D399, #10B981)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Period confirmation modal */}
      {showPeriodModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setShowPeriodModal(false)}>
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            style={{ background: "var(--color-surface)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                style={{ background: "rgba(248,113,113,0.1)" }}>🩸</div>
            </div>
            <h2 className="font-display text-xl font-semibold text-dark text-center mb-2">Start new cycle?</h2>
            <p className="text-sm text-dark/55 font-body text-center leading-relaxed mb-1">
              This will reset your cycle to Day 1 based on today.
            </p>
            <p className="text-xs text-dark/35 font-body text-center mb-6">You can change this later in settings.</p>
            <button onClick={confirmPeriodStart}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mb-2.5 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #F87171, #C48A97)" }}>
              Yes, start cycle
            </button>
            <button onClick={() => setShowPeriodModal(false)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(var(--color-text-rgb),0.04)", color: "var(--color-text-mid)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="relative mx-auto max-w-app px-4 pt-6 pb-28">

        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Settings</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Profile</h1>
          </div>
        </header>

        {/* ════════════════════════════════════════════════════
            Section 1 — Identity
        ════════════════════════════════════════════════════ */}
        <div className="bg-surface rounded-2xl p-5 shadow-card mb-3 flex flex-col items-center">

          {/* Avatar with phase-color ring */}
          <div className="relative mb-3">
            <div
              className="w-24 h-24 rounded-full p-[3px]"
              style={{
                background: `conic-gradient(${phaseColor} 0deg 240deg, ${phaseColor}22 240deg 360deg)`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-white"
                style={{ background: avatarUrl ? "transparent" : avatarColors[avatarIndex] }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  : <span className="text-white text-4xl font-display font-bold">{name.charAt(0).toUpperCase() || "?"}</span>
                }
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-soft transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #C96480, #A84468)" }}>
              {avatarUploading ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--color-surface)" strokeWidth="4"/>
                  <path className="opacity-75" fill="var(--color-surface)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="var(--color-surface)" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>

          {avatarUrl ? (
            <button onClick={handleRemoveAvatar}
              className="text-xs text-dark/30 hover:text-rose-400 font-body mb-2 transition-colors">
              Remove photo
            </button>
          ) : (
            <div className="flex gap-2 mb-2">
              {avatarColors.map((grad, i) => (
                <button key={i} onClick={() => { setAvatarIndex(i); setDirty(true); }}
                  className="w-8 h-8 rounded-full transition-all active:scale-90"
                  style={{ background: grad, border: avatarIndex === i ? "2.5px solid #2E2E2E" : "2.5px solid transparent" }} />
              ))}
            </div>
          )}

          {/* Phase badge */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2"
            style={{ background: `${phaseColor}18`, color: phaseColor, border: `1px solid ${phaseColor}33` }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phaseColor }} />
            {PHASE_LABEL[phase]} · Day {cycleDay}
          </div>

          {/* Name */}
          <div className="relative w-full flex items-center justify-center">
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }}
              className="text-center text-dark font-display font-semibold text-xl outline-none bg-transparent border-b border-transparent focus:border-dark/15 transition-colors pb-0.5 w-full"
              placeholder="Your name" />
            <svg className="absolute right-0 w-3.5 h-3.5 pointer-events-none opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-mid)" }}>
              <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 013.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </div>

          {/* Sub-line: member since + streak */}
          <p className="text-dark/35 text-xs font-body mt-1">
            {[
              memberSince ? `Since ${memberSince}` : null,
              streak > 0  ? `${streak}🔥 streak`   : null,
            ].filter(Boolean).join(" · ") || "Add a photo"}
          </p>

          {/* Weight trend */}
          {weightDelta !== null && (
            <div
              className="flex items-center justify-center gap-2 mt-3 px-4 py-2 rounded-xl"
              style={{ background: "rgba(52,211,153,0.10)" }}
            >
              <span className="text-xs font-body" style={{ color: "var(--color-text-dim)" }}>Weight</span>
              <span className="text-sm font-bold text-dark">{weightDelta.latest} kg</span>
              <span
                className="text-xs font-semibold"
                style={{
                  color: weightDelta.delta < -0.09 ? "#34D399"
                       : weightDelta.delta >  0.09 ? "#F87171"
                       : "var(--color-text-dim)",
                }}
              >
                {weightDelta.delta < -0.09
                  ? `↓ ${Math.abs(weightDelta.delta)} kg this week`
                  : weightDelta.delta > 0.09
                  ? `↑ ${weightDelta.delta} kg this week`
                  : "→ stable this week"}
              </span>
            </div>
          )}

          {/* Profile completeness — hidden when complete */}
          {!isComplete && firstMissing && (
            <div className="w-full mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs text-dark/45 font-body text-center leading-relaxed mb-3">
                {completenessNudge[firstMissing.label]}
              </p>
              <div className="flex gap-1.5">
                {completenessItems.map((item, i) => (
                  <div key={i} className="flex-1 h-2 rounded-full transition-all duration-500"
                    style={{ background: item.done ? phaseColor : "rgba(var(--color-text-rgb),0.08)" }} />
                ))}
              </div>
              <p className="text-xs text-dark/25 font-body text-center mt-2">{completeCount} of {completenessItems.length} complete</p>
            </div>
          )}
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Streak",   value: streak > 0 ? `${streak}🔥` : "—",    sub: "days" },
            { label: "Workouts", value: workoutCount ?? "—",                   sub: "logged" },
            { label: "PRs",      value: prCount ?? "—",                        sub: "set" },
          ].map(s => (
            <div key={s.label} className="rounded-[18px] p-3 text-center"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-soft)" }}>
              <p className="font-accent text-lg font-bold text-dark leading-none">{s.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.10em] mt-1" style={{ color: "var(--color-text-dim)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* New profile cards */}
        <TopLiftsCard prs={topPrs} />
        <ProgressPhotosCard
          photos={progressPhotos}
          onPhotoAdded={() => getProgressPhotos().then(setProgressPhotos)}
          onViewTimeline={() => setShowTimeline(true)}
        />
        {achievements.length > 0 && <AchievementsCard achievements={achievements} />}

        {/* ════════════════════════════════════════════════════
            Section 2 — Cycle
        ════════════════════════════════════════════════════ */}
        <div className="bg-surface rounded-2xl shadow-card mb-2 overflow-hidden">
          <button
            onClick={() => setShowCycleAccordion(v => !v)}
            className="w-full flex items-center justify-between px-4 py-4 transition-all"
            style={{ background: showCycleAccordion ? "rgba(196,138,151,0.06)" : "transparent" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{ background: "rgba(196,138,151,0.1)" }}>🩸</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-dark">Cycle settings</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: phaseColor }} />
                  <p className="text-xs text-dark/40 font-body">{cycleLength}d cycle · {periodLength}d period</p>
                </div>
                {periodUpdated && (
                  <p className="text-xs text-dark/25 font-body mt-0.5">Last updated {periodUpdated}</p>
                )}
              </div>
            </div>
            <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200" style={{ color: "var(--color-text-dim)", transform: showCycleAccordion ? "rotate(180deg)" : "rotate(0deg)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {showCycleAccordion && (
            <div className="px-4 pb-4 border-t border-[var(--color-border)] space-y-5 pt-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-dark">Cycle length</label>
                  <span className="text-sm font-bold text-primary">{cycleLength} days</span>
                </div>
                <input type="range" min={21} max={35} value={cycleLength}
                  onChange={(e) => { setCycleLength(Number(e.target.value)); setDirty(true); }} className="w-full" />
                <div className="flex justify-between text-xs text-dark/30 mt-1"><span>21</span><span>28</span><span>35</span></div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-dark">Period length</label>
                  <span className="text-sm font-bold" style={{ color: "#F87171" }}>{periodLength} days</span>
                </div>
                <input type="range" min={2} max={8} value={periodLength}
                  onChange={(e) => { setPeriodLength(Number(e.target.value)); setDirty(true); }} className="w-full" />
                <div className="flex justify-between text-xs text-dark/30 mt-1"><span>2</span><span>5</span><span>8</span></div>
              </div>

              <div>
                <button
                  onClick={() => setShowAdvancedOvulation(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-dark/35 mb-3">
                  <svg className="w-3 h-3 flex-shrink-0 transition-transform duration-200" style={{ transform: showAdvancedOvulation ? "rotate(90deg)" : "rotate(0deg)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
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
                      onChange={(e) => { setOvulationLength(Number(e.target.value)); setDirty(true); }} className="w-full" />
                    <div className="flex justify-between text-xs text-dark/30 mt-1"><span>1</span><span>3</span><span>5</span></div>
                  </div>
                )}
              </div>

              {/* Live phase preview */}
              <div className="rounded-xl overflow-hidden border border-[var(--color-border)]">
                {[
                  { label: "🌙 Menstrual",  days: `${periodLength}d`,    note: "your period",  color: "#F87171" },
                  { label: "🌱 Follicular", days: `~${folLen}d`,         note: "auto",         color: "#34D399" },
                  { label: "⚡ Ovulation",  days: `${ovulationLength}d`, note: "your window",  color: "#FBBF24" },
                  { label: "🍂 Luteal",     days: `~${lutLen}d`,         note: "auto",         color: "#A78BFA" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] last:border-0">
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

        {/* Period reset button */}
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
        <div className="bg-surface rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">My goals</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const active = selectedGoals.includes(g);
              return (
                <button key={g} onClick={() => toggleGoal(g)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: active ? "rgba(196,138,151,0.15)" : "var(--color-ghost)",
                    color:      active ? "#C48A97" : "var(--color-text-mid)",
                    border:     `1.5px solid ${active ? "rgba(196,138,151,0.5)" : "transparent"}`,
                  }}>
                  {g}
                </button>
              );
            })}
          </div>
          {/* Why goals matter */}
          <p className="text-xs text-dark/30 font-body mt-3 text-center">
            Affects your nutrition targets and training suggestions
          </p>
        </div>

        {/* ════════════════════════════════════════════════════
            Section 4 — Nutrition / Macros
        ════════════════════════════════════════════════════ */}
        <div className="bg-surface rounded-2xl shadow-card mb-3 overflow-hidden">
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
              <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-200" style={{ color: "var(--color-text-dim)", transform: showCalc ? "rotate(180deg)" : "rotate(0deg)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
          </button>

          {showCalc && (
            <div className="px-4 pb-5 border-t border-[var(--color-border)]">
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
                        onChange={(e) => { f.set(e.target.value); setDirty(true); }}
                        className="w-full bg-background rounded-xl px-3 py-2.5 text-sm text-dark outline-none font-body border border-transparent focus:border-primary/30 transition-colors pr-8"
                        min={f.min} max={f.max} />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-dark/30 font-semibold">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Activity level chips with description for selected */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Activity level</label>
                <div className="flex flex-wrap gap-2 mb-1.5">
                  {(Object.entries(ACTIVITY_SHORT) as [ActivityLevel, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => { setActivityLevel(key); setDirty(true); }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                      style={{
                        background: activityLevel === key ? "rgba(196,138,151,0.15)" : "var(--color-ghost)",
                        color:      activityLevel === key ? "#C48A97" : "var(--color-text-mid)",
                        border:     `1px solid ${activityLevel === key ? "rgba(196,138,151,0.4)" : "transparent"}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Description for selected chip */}
                <p className="text-xs text-dark/35 font-body pl-1">{ACTIVITY_DESC[activityLevel]}</p>
              </div>

              {/* Body goal */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-dark/40 uppercase tracking-wide block mb-2">Body goal</label>
                <div className="flex gap-2">
                  {(Object.entries(GOAL_LABELS) as [BodyGoal, typeof GOAL_LABELS[BodyGoal]][]).map(([key, g]) => (
                    <button key={key} onClick={() => { setBodyGoal(key); setDirty(true); }}
                      className="flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl transition-all active:scale-95"
                      style={{
                        background: bodyGoal === key ? "rgba(196,138,151,0.12)" : "var(--color-ghost)",
                        border:     `1.5px solid ${bodyGoal === key ? "rgba(196,138,151,0.35)" : "transparent"}`,
                      }}>
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-xs font-bold" style={{ color: bodyGoal === key ? "#C48A97" : "var(--color-text)" }}>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 mb-4"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                Calculate targets
              </button>

              {/* Results — light card, consistent with page style */}
              {macroResult && (
                <div className="rounded-2xl overflow-hidden border border-[var(--color-border)]"
                  style={{ background: "linear-gradient(135deg, rgba(196,138,151,0.07), rgba(123,109,141,0.05))" }}>
                  <div className="p-4">
                    {/* Kcal */}
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <p className="text-dark/40 text-xs font-semibold uppercase tracking-wide">Daily target</p>
                        <p className="text-dark font-display font-bold text-3xl leading-none mt-0.5">{macroResult.targetCalories}</p>
                        <p className="text-dark/40 text-xs font-body mt-0.5">kcal / day</p>
                      </div>
                      {(macroResult.deficit ?? 0) > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(248,113,113,0.1)", color: "#F87171" }}>
                          −{macroResult.deficit} kcal
                        </span>
                      )}
                      {(macroResult.surplus ?? 0) > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: "rgba(52,211,153,0.1)", color: "#059669" }}>
                          +{macroResult.surplus} kcal
                        </span>
                      )}
                    </div>

                    {/* Macro grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: "Protein", value: macroResult.protein, color: "#C48A97" },
                        { label: "Carbs",   value: macroResult.carbs,   color: "#7B6D8D" },
                        { label: "Fats",    value: macroResult.fats,    color: "#A78BFA" },
                      ].map((m) => (
                        <div key={m.label} className="bg-surface rounded-xl p-2.5 text-center shadow-sm">
                          <p className="font-display font-bold text-xl" style={{ color: m.color }}>{m.value}g</p>
                          <p className="text-xs font-semibold uppercase tracking-wide mt-0.5 text-dark/50">{m.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Details — ratio bar (collapsed) */}
                    <button
                      onClick={() => setShowMacroDetails(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-dark/35 font-semibold mb-2">
                      <svg className="w-3 h-3 flex-shrink-0 transition-transform duration-200" style={{ transform: showMacroDetails ? "rotate(90deg)" : "rotate(0deg)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
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
                            <div style={{ width: `${cPct}%`, background: "#7B6D8D" }} />
                            <div style={{ width: `${fPct}%`, background: "#A78BFA" }} className="rounded-r-full" />
                          </div>
                          <div className="flex justify-between text-xs text-dark/40 font-semibold">
                            <span>P {pPct}%</span><span>C {cPct}%</span><span>F {fPct}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

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
        <div className="bg-surface rounded-2xl p-4 shadow-card mb-3">
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">How you track</p>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-base">⚖️</span>
              <div>
                <p className="text-sm font-semibold text-dark">Weight units</p>
                <p className="text-xs text-dark/40 font-body">Used in training log</p>
              </div>
            </div>
            <div className="flex rounded-xl overflow-hidden border border-[var(--color-border)]">
              {(["kg", "lbs"] as const).map((u) => (
                <button key={u} onClick={() => { setUnits(u); setDirty(true); }}
                  className="px-4 py-1.5 text-sm font-semibold transition-all"
                  style={{ background: units === u ? "#C48A97" : "transparent", color: units === u ? "var(--color-surface)" : "var(--color-text-dim)" }}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <span className="text-base">🔔</span>
              <div>
                <p className="text-sm font-semibold text-dark">Notifications</p>
                <p className="text-xs text-dark/40 font-body">Daily reminders & insights</p>
              </div>
            </div>
            <button
              onClick={() => { setNotifications(v => !v); setDirty(true); }}
              className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
              style={{ background: notifications ? "#C48A97" : "#E5E7EB" }}>
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-all duration-300"
                style={{ left: notifications ? "calc(100% - 22px)" : "2px" }} />
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            Section 6 — My Data
        ════════════════════════════════════════════════════ */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2 px-1">My data</p>
          <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
            {[
              { label: "Weight Tracker",   sub: "Log daily weight and see your trend", emoji: "⚖️", href: "/weight",  bg: "linear-gradient(135deg, #7B6D8D, #C48A97)", count: weightCount,  unit: "entries" },
              { label: "Personal Records", sub: "Track your strongest lifts by phase",  emoji: "🏆", href: "/prs",     bg: "linear-gradient(135deg, #C48A97, #7B6D8D)", count: prCount,      unit: "PRs" },
              { label: "Training History", sub: "All your past workouts",               emoji: "📋", href: "/history", bg: "linear-gradient(135deg, #A78BFA, #7B6D8D)", count: workoutCount, unit: "workouts" },
            ].map((item, i, arr) => (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-4 transition-all active:scale-98"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(var(--color-text-rgb),0.04)" : "none" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: item.bg }}>{item.emoji}</div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-dark">{item.label}</p>
                  <p className="text-xs text-dark/40 font-body">{item.sub}</p>
                </div>
                {item.count !== null && item.count > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: "rgba(196,138,151,0.1)", color: "#C48A97" }}>
                    {item.count} {item.unit}
                  </span>
                )}
                <svg className="w-4 h-4 flex-shrink-0 opacity-30" style={{ color: "var(--color-text-mid)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            Section 7 — Account
        ════════════════════════════════════════════════════ */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-dark/40 uppercase tracking-wide mb-2 px-1">Account</p>
          <div className="bg-surface rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <p className="text-xs text-dark/40 font-body">Signed in as</p>
              <p className="text-sm font-medium text-dark truncate">{user.email}</p>
            </div>
            <a href="mailto:wwealth989@gmail.com?subject=HerPhase Feedback&body=Hi! Here's my feedback on HerPhase:%0A%0AWhat I love:%0A%0AWhat confused me:%0A%0AWhat's missing:%0A%0AWhat I'd pay for:%0A"
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] transition-all active:scale-98">
              <span className="text-base">💌</span>
              <span className="text-sm font-semibold text-dark">Send feedback</span>
            </a>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:scale-98"
              style={{ borderTop: "1px solid rgba(248,113,113,0.08)" }}>
              <svg className="w-4 h-4 flex-shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              <span className="text-sm font-semibold text-rose-400">Sign out</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6 mb-2 font-body" style={{ color: "var(--color-text-dim)" }}>
          <a href="/privacy" className="underline hover:opacity-70 transition-opacity">
            Privacy Policy
          </a>
        </p>

      </main>

      {/* Progress Timeline modal */}
      {showTimeline && (
        <ProgressTimeline
          onClose={() => setShowTimeline(false)}
          currentPhase={phase}
        />
      )}

      {/* ════════════════════════════════════════════════════
          Sticky Save — only visible when dirty
      ════════════════════════════════════════════════════ */}
      {(dirty || saveStatus !== "idle") && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pointer-events-none">
          <button
            onClick={handleSave}
            disabled={saveStatus === "loading"}
            className="w-full max-w-app mx-auto py-4 rounded-2xl font-semibold text-white text-sm tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 pointer-events-auto"
            style={{
              background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)"
                : saveStatus === "error"   ? "linear-gradient(135deg, #F87171, #EF4444)"
                : "linear-gradient(135deg, #C48A97, #7B6D8D)",
              boxShadow: "0 8px 24px rgba(196,138,151,0.45), 0 0 0 3px rgba(255,255,255,0.9)",
            }}>
            {saveStatus === "loading" ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--color-surface)" strokeWidth="4"/>
                  <path className="opacity-75" fill="var(--color-surface)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving…
              </>
            ) : saveStatus === "success" ? (
              "✓ Saved!"
            ) : saveStatus === "error" ? (
              "✗ Error — Retry"
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-300 flex-shrink-0" />
                Save changes
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
