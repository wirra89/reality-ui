"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/history/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { supabase, type WeightLog } from "@/lib/supabase";
import type { Workout, MealLog, MoodLog } from "@/lib/supabase";
import WeightChart from "@/components/WeightChart";

type Tab = "workouts" | "meals" | "mood" | "weight";

const PHASE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  menstrual:  { bg: "#FEF2F2", text: "#B91C1C", dot: "#F87171" },
  follicular: { bg: "#F0FDF4", text: "#166534", dot: "#34D399" },
  ovulation:  { bg: "#FFFBEB", text: "#92400E", dot: "#FBBF24" },
  luteal:     { bg: "#F5F3FF", text: "#5B21B6", dot: "#A78BFA" },
};

const phaseSymptoms: Record<string, { positive: string[] }> = {
  menstrual:  { positive: ["Introspective", "Calm", "Restful sleep", "Emotional clarity", "Craving healthy food"] },
  follicular: { positive: ["High energy", "Creative", "Motivated", "Sociable", "Confident", "Clear-headed", "Strong in gym"] },
  ovulation:  { positive: ["Peak energy", "Confident", "Attractive feeling", "Strong libido", "Sharp focus", "PR in gym", "Social butterfly"] },
  luteal:     { positive: ["Productive", "Detail-oriented", "Nesting energy", "Emotional depth", "Intuitive"] },
};

const PHASE_EMOJIS: Record<string, string> = {
  menstrual: "🌙", follicular: "🌱", ovulation: "⚡", luteal: "🍂",
};

const MOOD_EMOJIS = ["", "😣", "😔", "😐", "🙂", "😄"];
const ENERGY_LABELS = ["", "Exhausted", "Tired", "Moderate", "Energised", "Peak"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const { user, loading } = useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("workouts");
  const [workouts, setWorkouts]   = useState<Workout[]>([]);
  const [meals, setMeals]         = useState<MealLog[]>([]);
  const [moods, setMoods]         = useState<MoodLog[]>([]);
  const [weights, setWeights]     = useState<WeightLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [expandedId, setExpandedId]   = useState<number | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  // V1.1 nutrition entries grouped by UTC date string (YYYY-MM-DD)
  type V1Entry = { name: string; kcal: number; protein: number; carbs: number; fats: number; mealType: string };
  const [v1ByDate, setV1ByDate] = useState<Record<string, V1Entry[]>>({});

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);

    Promise.all([
      supabase.from("workouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("meal_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
      supabase.from("mood_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
      supabase.from("weight_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(90),
      supabase.from("meal_log_entries")
        .select("snapshot_name,snapshot_kcal,snapshot_protein_g,snapshot_carbs_g,snapshot_fats_g,meal_type,logged_at")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(300),
    ]).then(([w, m, mo, wt, v1]) => {
      setWorkouts(w.data ?? []);
      setMeals(m.data ?? []);
      setMoods(mo.data ?? []);
      setWeights(wt.data ?? []);
      // Group V1.1 entries by UTC date
      const grouped: Record<string, V1Entry[]> = {};
      for (const row of (v1.data ?? [])) {
        const date = (row.logged_at as string).split("T")[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push({
          name:     row.snapshot_name    as string,
          kcal:     Number(row.snapshot_kcal)      || 0,
          protein:  Number(row.snapshot_protein_g) || 0,
          carbs:    Number(row.snapshot_carbs_g)   || 0,
          fats:     Number(row.snapshot_fats_g)    || 0,
          mealType: row.meal_type as string,
        });
      }
      setV1ByDate(grouped);
      setDataLoading(false);
    });
  }, [user]);

  // Stats
  const totalVolume = workouts.reduce((acc, w) => {
    const exs = w.exercises as unknown as { sets: { reps: string; weight: string }[] }[];
    return acc + exs.reduce((a, e) => a + e.sets.reduce((s, r) => s + (parseFloat(r.reps) || 0) * (parseFloat(r.weight) || 0), 0), 0);
  }, 0);

  const totalCalories =
    meals.reduce((acc, m) => {
      const entries = m.meals as unknown as { calories: string }[];
      return acc + entries.reduce((a, e) => a + (parseFloat(e.calories) || 0), 0);
    }, 0) +
    Object.values(v1ByDate).flat().reduce((a, e) => a + e.kcal, 0);

  const avgMood = moods.length > 0
    ? (moods.reduce((a, m) => a + (m.mood as unknown as number), 0) / moods.length).toFixed(1)
    : "—";

  const phases = ["all", "menstrual", "follicular", "ovulation", "luteal"];

  const filteredWorkouts = phaseFilter === "all" ? workouts : workouts.filter(w => w.phase === phaseFilter);
  const filteredMeals    = phaseFilter === "all" ? meals    : meals.filter(m => m.phase === phaseFilter);
  const filteredMoods    = phaseFilter === "all" ? moods    : moods.filter(m => m.phase === phaseFilter);

  if (loading || !user) return (
    <PageSkeleton />
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6">

        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors">
            ←
          </button>
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest">History</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Your Progress 📊</h1>
          </div>
        </header>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Workouts", value: workouts.length, emoji: "🏋️‍♀️" },
            { label: "Volume kg", value: totalVolume > 0 ? `${(totalVolume/1000).toFixed(1)}t` : "—", emoji: "⚡" },
            { label: "Avg Mood", value: avgMood, emoji: "😊" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-card">
              <div className="text-xl mb-0.5">{s.emoji}</div>
              <p className="font-display font-bold text-lg text-dark">{s.value}</p>
              <p className="text-xs text-dark/40 font-semibold uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex rounded-2xl bg-white p-1 shadow-card mb-3 gap-1 overflow-x-auto">
          {([
            { id: "workouts",  label: "Training", emoji: "🏋️‍♀️" },
            { id: "meals",     label: "Meals",    emoji: "🥗" },
            { id: "mood",      label: "Mood",     emoji: "💭" },
            { id: "weight",    label: "Weight",   emoji: "⚖️" },
          ] as { id: Tab; label: string; emoji: string }[]).map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1"
              style={{
                background: activeTab === t.id ? "linear-gradient(135deg, #C48A97, #7B6D8D)" : "transparent",
                color: activeTab === t.id ? "white" : "#9CA3AF",
              }}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Phase filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {phases.map((p) => {
            const active = phaseFilter === p;
            const color = p !== "all" ? PHASE_COLORS[p]?.dot : "#9CA3AF";
            return (
              <button key={p} onClick={() => setPhaseFilter(p)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: active ? (p !== "all" ? PHASE_COLORS[p]?.bg : "#F3F4F6") : "white",
                  color: active ? (p !== "all" ? PHASE_COLORS[p]?.text : "#374151") : "#9CA3AF",
                  border: `1px solid ${active ? color + "44" : "transparent"}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}>
                {p !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                {p === "all" ? "All phases" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            );
          })}
        </div>
        {dataLoading ? (
          <div className="text-center py-12">
            <p className="text-dark/40 text-sm">Loading history…</p>
          </div>
        ) : (
          <>
            {/* ── WORKOUTS ── */}
            {activeTab === "workouts" && (
              <div className="space-y-3 mb-6">
                {filteredWorkouts.length === 0 ? (
                  <EmptyState emoji="🏋️‍♀️" text="No workouts logged yet" sub="Head to the Training tab to log your first workout" cta="Go to Training" ctaHref="/training" />
                ) : (
                  <>
                    {/* Volume trend — last 2 workouts comparison */}
                    {workouts.length >= 2 && (() => {
                      const exs0 = (workouts[0].exercises as unknown as { sets: { reps: string; weight: string }[] }[]);
                      const exs1 = (workouts[1].exercises as unknown as { sets: { reps: string; weight: string }[] }[]);
                      const vol0 = exs0.reduce((a, e) => a + e.sets.reduce((s, r) => s + (parseFloat(r.reps)||0) * (parseFloat(r.weight)||0), 0), 0);
                      const vol1 = exs1.reduce((a, e) => a + e.sets.reduce((s, r) => s + (parseFloat(r.reps)||0) * (parseFloat(r.weight)||0), 0), 0);
                      if (vol0 === 0 || vol1 === 0) return null;
                      const diff = vol0 - vol1;
                      const pct = Math.abs(Math.round((diff / vol1) * 100));
                      const up = diff >= 0;
                      return (
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-card flex items-center gap-3 mb-1">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                            style={{ background: up ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)" }}>
                            {up ? "📈" : "📉"}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-dark">Volume vs last session</p>
                            <p className="text-xs text-dark/40 font-body">{vol0.toFixed(0)} kg this session</p>
                          </div>
                          <span className="text-sm font-bold" style={{ color: up ? "#34D399" : "#F87171" }}>
                            {up ? "+" : "-"}{pct}%
                          </span>
                        </div>
                      );
                    })()}
                    {filteredWorkouts.map((w) => {
                      const exs = w.exercises as unknown as { name: string; sets: { reps: string; weight: string }[] }[];
                      const vol = exs.reduce((a, e) => a + e.sets.reduce((s, r) => s + (parseFloat(r.reps)||0) * (parseFloat(r.weight)||0), 0), 0);
                      const totalSets = exs.reduce((a, e) => a + e.sets.length, 0);
                      const phaseStyle = PHASE_COLORS[w.phase] ?? PHASE_COLORS.follicular;
                      const isExpanded = expandedId === w.id;
                      return (
                        <div key={w.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                          <button onClick={() => setExpandedId(isExpanded ? null : w.id!)}
                            className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                              style={{ background: phaseStyle.bg }}>
                              {PHASE_EMOJIS[w.phase]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-dark font-semibold text-sm truncate">{w.name || "Workout"}</p>
                              <p className="text-dark/40 text-xs font-body mt-0.5">
                                {formatDate(w.created_at!)} · {formatTime(w.created_at!)}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: phaseStyle.bg, color: phaseStyle.text }}>
                                {w.phase}
                              </span>
                            </div>
                            <span className="text-dark/30 text-sm ml-1">{isExpanded ? "↑" : "↓"}</span>
                          </button>
                          <div className="flex gap-4 px-4 pb-3 border-b border-gray-50">
                            <Stat label="Exercises" value={exs.length} />
                            <Stat label="Sets" value={totalSets} />
                            <Stat label="Volume" value={vol > 0 ? `${vol.toFixed(0)}kg` : "—"} />
                            <Stat label="Day" value={`D${w.cycle_day}`} />
                          </div>
                          {isExpanded && exs.length > 0 && (
                            <div className="px-4 py-3 space-y-3">
                              {exs.map((ex, i) => (
                                <div key={i}>
                                  <p className="text-dark font-semibold text-xs mb-1.5">{ex.name || `Exercise ${i + 1}`}</p>
                                  <div className="space-y-1">
                                    {ex.sets.map((s, si) => (
                                      <div key={si} className="flex items-center gap-3 text-xs text-dark/60 font-body">
                                        <span className="w-5 h-5 rounded-full bg-background flex items-center justify-center text-xs font-semibold text-dark/40 flex-shrink-0">{si + 1}</span>
                                        <span>{s.reps || "—"} reps</span>
                                        <span className="text-dark/30">×</span>
                                        <span>{s.weight || "—"} kg</span>
                                        {s.reps && s.weight && (
                                          <span className="text-dark/30 ml-auto">= {(parseFloat(s.reps) * parseFloat(s.weight)).toFixed(0)} kg</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* ── MEALS ── */}
            {activeTab === "meals" && (
              <div className="space-y-3 mb-6">
                {filteredMeals.length === 0 && Object.keys(v1ByDate).length === 0 ? (
                  <EmptyState emoji="🥗" text="No meals logged yet" sub="Head to the Meals tab to log your food" cta="Go to Meals" ctaHref="/meals" />
                ) : filteredMeals.map((m) => {
                  const legacyEntries = (m.meals as unknown as { name: string; calories: string; protein: string; time: string; mealType: string }[]) ?? [];
                  // V1.1 entries for this date (shown when legacy JSONB is empty)
                  const v1Entries = v1ByDate[m.date!] ?? [];
                  const useV1 = legacyEntries.length === 0 && v1Entries.length > 0;
                  const totalCal  = useV1
                    ? v1Entries.reduce((a, e) => a + e.kcal, 0)
                    : legacyEntries.reduce((a, e) => a + (parseFloat(e.calories) || 0), 0);
                  const totalProt = useV1
                    ? v1Entries.reduce((a, e) => a + e.protein, 0)
                    : legacyEntries.reduce((a, e) => a + (parseFloat(e.protein) || 0), 0);
                  const itemCount = useV1 ? v1Entries.length : legacyEntries.length;
                  // Skip cards that have neither legacy nor V1.1 entries
                  if (itemCount === 0) return null;
                  const phaseStyle = PHASE_COLORS[m.phase] ?? PHASE_COLORS.follicular;
                  const isExpanded = expandedId === m.id;
                  return (
                    <div key={m.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                      <button onClick={() => setExpandedId(isExpanded ? null : m.id!)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: phaseStyle.bg }}>{PHASE_EMOJIS[m.phase]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-dark font-semibold text-sm">{formatDate(m.date!)}</p>
                          <p className="text-dark/40 text-xs font-body mt-0.5">{itemCount} items · {totalCal > 0 ? `${Math.round(totalCal)} kcal` : "—"} · {totalProt > 0 ? `${Math.round(totalProt)}g protein` : "—"}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: phaseStyle.bg, color: phaseStyle.text }}>{m.phase}</span>
                        <span className="text-dark/30 text-sm ml-1">{isExpanded ? "↑" : "↓"}</span>
                      </button>
                      <div className="flex gap-4 px-4 pb-3 border-b border-gray-50">
                        <Stat label="Items" value={itemCount} />
                        <Stat label="Calories" value={totalCal > 0 ? Math.round(totalCal) : "—"} />
                        <Stat label="Protein" value={totalProt > 0 ? `${Math.round(totalProt)}g` : "—"} />
                        <Stat label="Day" value={`D${m.cycle_day}`} />
                      </div>
                      {isExpanded && (
                        <div className="px-4 py-3 space-y-2">
                          {useV1
                            ? v1Entries.map((e, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-dark text-xs font-semibold truncate">{e.name}</p>
                                    <p className="text-dark/40 text-xs font-body capitalize">{e.mealType}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0 text-xs font-semibold space-y-0.5">
                                    <p className="text-dark/60">{Math.round(e.kcal)} kcal</p>
                                    <div className="flex gap-1.5 justify-end">
                                      {e.protein > 0 && <span className="text-[#7B6D8D]">P:{Math.round(e.protein)}g</span>}
                                      {e.carbs > 0   && <span className="text-[#C48A97]">C:{Math.round(e.carbs)}g</span>}
                                      {e.fats > 0    && <span className="text-[#A78BFA]">F:{Math.round(e.fats)}g</span>}
                                    </div>
                                  </div>
                                </div>
                              ))
                            : legacyEntries.map((e, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-dark text-xs font-semibold truncate">{e.name}</p>
                                    <p className="text-dark/40 text-xs font-body">{e.time} · {e.mealType}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0 text-xs font-semibold space-y-0.5">
                                    {e.calories && <p className="text-dark/60">{e.calories} kcal</p>}
                                    <div className="flex gap-1.5 justify-end">
                                      {e.protein && <span className="text-[#7B6D8D]">P:{e.protein}g</span>}
                                      {(e as { carbs?: string }).carbs && <span className="text-[#C48A97]">C:{(e as { carbs?: string }).carbs}g</span>}
                                      {(e as { fats?: string }).fats && <span className="text-[#A78BFA]">F:{(e as { fats?: string }).fats}g</span>}
                                    </div>
                                  </div>
                                </div>
                              ))
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── MOOD ── */}
            {activeTab === "mood" && (
              <div className="space-y-3 mb-6">
                {filteredMoods.length === 0 ? (
                  <EmptyState emoji="💭" text="No mood logs yet" sub="Head to the Mood tab to log your daily check-in" cta="Go to Mood" ctaHref="/mood" />
                ) : (
                  <>
                    {/* Mood trend chart — last 14 days */}
                    {moods.length >= 3 && (
                      <div className="bg-white rounded-2xl shadow-card p-4 mb-1">
                        <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Mood & energy trend</p>
                        <div className="flex items-end gap-1 h-16">
                          {[...moods].reverse().slice(-14).map((m, i) => {
                            const moodVal   = (m.mood as unknown as number) ?? 0;
                            const energyVal = (m.energy as unknown as number) ?? 0;
                            const phaseColor = PHASE_COLORS[m.phase]?.dot ?? "#9CA3AF";
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                <div className="w-full rounded-t-sm transition-all" style={{ height: `${(moodVal / 5) * 100}%`, background: phaseColor, opacity: 0.85, minHeight: 4 }} />
                                <div className="w-full rounded-t-sm" style={{ height: `${(energyVal / 5) * 48}%`, background: phaseColor, opacity: 0.35, minHeight: 2 }} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-dark/30">14 days ago</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-xs text-dark/40"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#C48A97", opacity: 0.85 }} />Mood</span>
                            <span className="flex items-center gap-1 text-xs text-dark/40"><span className="w-2 h-2 rounded-sm inline-block" style={{ background: "#C48A97", opacity: 0.35 }} />Energy</span>
                          </div>
                          <span className="text-xs text-dark/30">Today</span>
                        </div>
                      </div>
                    )}
                    {filteredMoods.map((m) => {
                      const mood   = m.mood as unknown as number;
                      const energy = m.energy as unknown as number;
                      const symptoms = m.symptoms as unknown as string[];
                      const note     = m.note as unknown as string;
                      const phaseStyle = PHASE_COLORS[m.phase] ?? PHASE_COLORS.follicular;
                      return (
                        <div key={m.id} className="bg-white rounded-2xl shadow-card px-4 py-3.5">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">{MOOD_EMOJIS[mood]}</span>
                            <div className="flex-1">
                              <p className="text-dark font-semibold text-sm">{formatDate(m.date!)}</p>
                              <p className="text-dark/40 text-xs font-body">Energy: {ENERGY_LABELS[energy]} · Day {m.cycle_day}</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: phaseStyle.bg, color: phaseStyle.text }}>{m.phase}</span>
                          </div>
                          {symptoms?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {symptoms.map((s: string) => {
                                const isPositive = phaseSymptoms[m.phase]?.positive?.includes(s);
                                return (
                                  <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: isPositive ? "rgba(52,211,153,0.12)" : "#F9FAFB", color: isPositive ? "#059669" : "#6B7280" }}>
                                    {isPositive ? "✦ " : ""}{s}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {note && <p className="text-dark/50 text-xs font-body italic">"{note}"</p>}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

          {/* ── WEIGHT ── */}
          {activeTab === "weight" && (
            <div className="mb-6">
              {weights.length === 0 ? (
                <EmptyState emoji="⚖️" text="No weight entries yet" sub="Track your weight to see trends over your cycle" cta="Log weight" ctaHref="/weight" />
              ) : (
                <>
                  {/* Weight chart */}
                  <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
                    <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">Weight over time</p>
                    <WeightChart logs={[...weights].reverse()} compact />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {(() => {
                      const vals = [...weights].reverse();
                      const latest = vals[vals.length - 1]?.weight_kg;
                      const oldest = vals[0]?.weight_kg;
                      const change = latest && oldest ? latest - oldest : null;
                      return [
                        { label: "Latest",  value: latest ? `${latest}kg` : "—" },
                        { label: "Change",  value: change !== null ? (change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1)) + "kg" : "—", color: change !== null ? (change < 0 ? "#34D399" : "#F87171") : undefined },
                        { label: "Entries", value: weights.length },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl p-3 text-center shadow-card">
                          <p className="font-display font-bold text-base text-dark" style={{ color: (s as { color?: string }).color }}>{s.value}</p>
                          <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold mt-0.5">{s.label}</p>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="space-y-2">
                    {weights.slice(0, 30).map((w, i) => {
                      const prev = weights[i + 1];
                      const diff = prev ? w.weight_kg - prev.weight_kg : null;
                      return (
                        <div key={i} className="bg-white rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(196,138,151,0.1)" }}>
                            <span className="font-display font-bold text-xs text-primary">{w.weight_kg}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-dark font-semibold text-sm">{w.weight_kg} kg</p>
                            {w.note && <p className="text-dark/40 text-xs font-body">{w.note as unknown as string}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-dark/40 text-xs font-body">{formatDate(w.date)}</p>
                            {diff !== null && diff !== 0 && (
                              <p className="text-xs font-semibold" style={{ color: diff < 0 ? "#34D399" : "#F87171" }}>
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}kg
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          </>
        )}

        {/* Link to full Insights page */}
        <button onClick={() => router.push("/insights")}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-dark/40 flex items-center justify-center gap-2 mb-4 active:scale-95 transition-all"
          style={{ background: "rgba(0,0,0,0.03)" }}>
          ✦ View cycle insights
          <span className="text-dark/25">→</span>
        </button>

      </main>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-dark font-semibold text-sm">{value}</p>
      <p className="text-xs text-dark/40 uppercase tracking-wide font-semibold">{label}</p>
    </div>
  );
}

function EmptyState({ emoji, text, sub, cta, ctaHref }: { emoji: string; text: string; sub: string; cta?: string; ctaHref?: string }) {
  const router = useRouter();
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="text-dark font-semibold text-sm mb-1">{text}</p>
      <p className="text-dark/40 text-xs font-body mb-4">{sub}</p>
      {cta && ctaHref && (
        <button onClick={() => router.push(ctaHref)}
          className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
          {cta} →
        </button>
      )}
    </div>
  );
}
