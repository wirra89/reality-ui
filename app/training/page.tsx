"use client";
import PageSkeleton from "@/components/PageSkeleton";

// app/training/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import {
  saveWorkout, updateWorkout, getTodayWorkout, saveWorkoutTemplate, getWorkoutTemplates, deleteWorkoutTemplate,
  savePR, getBestPRPerExercise,
  type Workout, type WorkoutTemplate, type PersonalRecord,
} from "@/lib/supabase";
import ExerciseLibrary from "@/components/ExerciseLibrary";
import { getExerciseInputTypeByName, type InputType } from "@/lib/exercises";
import { TrainingIntelligenceCard } from "@/components/TrainingIntelligenceCard";
import type { IntelligenceWorkoutExercise } from "@/components/TrainingIntelligenceCard";
import type { WorkoutTypeId } from "@/lib/trainingEngine";

interface SetRow { id: string; reps: string; weight: string; durationMin?: string; distanceKm?: string; }
interface ExRow  { id: string; name: string; sets: SetRow[]; exType: InputType; }

const PHASE_STARTS: Record<string, number> = {
  menstrual: 1, follicular: 6, ovulation: 14, luteal: 17,
};

const trainingMessages: Record<string, {
  category: string;
  title: string;
  detail: string;
}[]> = {
  menstrual: [
    {
      category: "Rest & restore",
      title: "Light / Recovery",
      detail: "Your body is doing powerful internal work. Gentle movement — walking, yin yoga, swimming — reduces cramping by clearing prostaglandins without depleting your system. This is training, just differently.",
    },
    {
      category: "Movement as medicine",
      title: "Gentle movement",
      detail: "Light circulation on your period days reduces cramp intensity and improves mood more effectively than rest alone. 20–30 minutes of low-intensity movement is the sweet spot.",
    },
    {
      category: "Mindset",
      title: "Honour your cycle",
      detail: "Skipping hard training this week isn't falling behind — it's periodisation. Elite female athletes deliberately reduce load during menstruation. You're training smarter, not less.",
    },
    {
      category: "What to do",
      title: "Foam rolling + mobility",
      detail: "Use this phase for the recovery work you usually skip. Foam rolling, hip mobility, and deep stretching maintain range of motion and reduce injury risk — without taxing your depleted energy.",
    },
    {
      category: "Transition",
      title: "Ease back in",
      detail: "Energy is starting to return. A gentle bodyweight session or slow walk today signals to your body that training is resuming. Tomorrow the follicular climb begins — you'll feel the difference.",
    },
  ],
  follicular: [
    {
      category: "Strength window",
      title: "Strength / Progressive overload",
      detail: "Rising oestrogen boosts muscle protein synthesis and increases pain tolerance. Your body literally builds muscle more efficiently right now. Increase weight, add a set, or reduce rest times this week.",
    },
    {
      category: "Try new things",
      title: "Learn new movements",
      detail: "Dopamine and oestrogen are rising — your brain is more receptive to learning motor patterns. This is the best phase to nail a new lift technique, try a new class, or attempt a movement you've been avoiding.",
    },
    {
      category: "Volume week",
      title: "Build your volume",
      detail: "Recovery is faster in the follicular phase. You can handle more sets, more sessions, and shorter rest periods than any other time in your cycle. If you're going to have a high-volume week, make it this one.",
    },
    {
      category: "Compound focus",
      title: "Compound lifts",
      detail: "Schedule your heaviest compound movements — squats, deadlifts, bench press, rows — in the follicular phase. The hormonal environment supports both strength gains and rapid recovery between sessions.",
    },
  ],
  ovulation: [
    {
      category: "Peak performance",
      title: "Heavy lifts / PRs / HIIT",
      detail: "Peak oestrogen plus a brief testosterone spike creates your strongest physiological window of the month. Research shows women are up to 10% stronger at ovulation. Book your personal records for today.",
    },
    {
      category: "Go all out",
      title: "Maximum intensity",
      detail: "Your VO2 max, anaerobic threshold, and pain tolerance are all at their highest. This is the day for sprint intervals, max effort sets, and anything that requires digging deep. Your body is ready.",
    },
    {
      category: "Injury note",
      title: "Warm up longer",
      detail: "High oestrogen loosens ligaments and tendons — making you both stronger and slightly more vulnerable to acute injuries. Extend your warm-up by 5 minutes and focus on controlled landing mechanics in plyometric work.",
    },
  ],
  luteal: [
    {
      category: "Maintain intensity",
      title: "Moderate intensity",
      detail: "Early luteal still supports solid training. Progesterone hasn't fully peaked — keep your normal intensity but start monitoring recovery. You don't need to downgrade yet, just stay aware.",
    },
    {
      category: "Temperature & pacing",
      title: "Adjust pace, not effort",
      detail: "Your core temperature is 0.3–0.5°C higher, making the same effort feel harder. Expect slightly slower times and higher perceived exertion — this is physiology, not fitness loss. Hydrate more than usual.",
    },
    {
      category: "Strength endurance",
      title: "Strength endurance circuits",
      detail: "Luteal phase favours moderate-load, higher-rep work over maximal effort. Circuit training, supersets, and tempo work are well-suited to this phase's hormonal profile.",
    },
    {
      category: "Recovery priority",
      title: "Prioritise recovery",
      detail: "Progesterone slows muscle repair. Sleep and nutrition become more important than adding training volume. Hit your protein target, sleep 8 hours, and don't skip your rest days.",
    },
    {
      category: "Late luteal",
      title: "Wind down volume",
      detail: "Both hormones are now falling. Your nervous system is more reactive and recovery is slower. Reduce total sets by 20–30% while keeping intensity. One fewer set per exercise is the right move.",
    },
    {
      category: "Mind-body",
      title: "Pilates / Yoga / Zone 2",
      detail: "Low-impact options aren't second-best in the late luteal phase — they're optimal. Pilates, yoga, and zone 2 cardio all maintain fitness, reduce cortisol, and are genuinely appropriate for where your hormones are right now.",
    },
  ],
};

const suggestedExercises: Record<string, string[]> = {
  menstrual:  ["Walking", "Yin Yoga", "Light Stretching", "Foam Rolling", "Swimming"],
  follicular: ["Barbell Squat", "Romanian Deadlift", "Bench Press", "Pull-ups", "Overhead Press"],
  ovulation:  ["Heavy Deadlift", "Back Squat", "Power Clean", "Box Jumps", "Sprint Intervals"],
  luteal:     ["Goblet Squat", "Hip Thrust", "Lat Pulldown", "Pilates", "Zone 2 Cardio"],
};

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#F87171", follicular: "#34D399", ovulation: "#FBBF24", luteal: "#A78BFA",
};

const newSet = (): SetRow => ({ id: crypto.randomUUID(), reps: "", weight: "" });
const newEx  = (name = "", exType: InputType = "weight_reps"): ExRow =>
  ({ id: crypto.randomUUID(), name, sets: [newSet()], exType });

export default function TrainingPage() {
  const { user, cycleDay, cycleParams, loading, todayState } = useApp();
  const router = useRouter();
  const phaseData = getPhaseData(cycleDay, cycleParams);

  // Rotating message
  const msgs       = trainingMessages[phaseData.phase] ?? trainingMessages.menstrual;
  const start      = PHASE_STARTS[phaseData.phase] ?? 1;
  const msgIdx     = Math.max(0, cycleDay - start) % msgs.length;
  const todayMsg   = msgs[msgIdx];
  const phaseColor = PHASE_COLORS[phaseData.phase] ?? "#C48A97";

  const [exercises, setExercises]     = useState<ExRow[]>([newEx()]);
  const [workoutName, setWorkoutName] = useState("");
  const [saveStatus, setSaveStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showLibrary, setShowLibrary] = useState(false);
  const [templates, setTemplates]         = useState<WorkoutTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [loggedWorkoutId, setLoggedWorkoutId] = useState<number | null>(null);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const [resolvedWorkoutType, setResolvedWorkoutType] = useState<WorkoutTypeId | null>(null);

  // Use today's date in draft key so drafts don't persist across cycles
  const today = new Date().toISOString().split("T")[0];
  const DRAFT_KEY = `herphase_workout_draft_${today}`;

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) getWorkoutTemplates().then(setTemplates);
  }, [user]);

  // On mount — load today's logged workout OR draft from localStorage.
  // Depends on user.id (stable string) NOT the user object — the user object reference
  // changes on every Supabase token refresh, which would re-run this effect and wipe
  // unsaved in-progress edits. user.id only changes on actual sign-in/out.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    getTodayWorkout(cycleDay).then((logged) => {
      // Always check for a draft first — it may contain more recent edits than the DB
      let draft: { name?: string; exs?: ExRow[]; loggedWorkoutId?: number | null } | null = null;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) draft = JSON.parse(raw);
      } catch { /* ignore bad draft */ }

      if (logged) {
        setLoggedWorkoutId(logged.id);
        // If the draft belongs to THIS logged workout, it's more recent than the DB row
        // (user added sets after the last explicit save) — prefer the draft.
        if (draft?.loggedWorkoutId === logged.id && draft.exs?.length) {
          if (draft.name) setWorkoutName(draft.name);
          setExercises(draft.exs);
        } else {
          // No matching draft — load from DB
          setWorkoutName(logged.name ?? "");
          const exs = logged.exercises as unknown as { name: string; sets: { reps: string; weight: string; durationMin?: string; distanceKm?: string }[] }[];
          setExercises(exs.map(e => ({
            id: crypto.randomUUID(),
            name: e.name,
            exType: getExerciseInputTypeByName(e.name),
            sets: e.sets.map(s => ({ id: crypto.randomUUID(), reps: s.reps ?? "", weight: s.weight ?? "", durationMin: s.durationMin, distanceKm: s.distanceKm })),
          })));
        }
      } else {
        // No logged workout — restore un-logged draft if exists
        if (draft && !draft.loggedWorkoutId && draft.exs?.length) {
          if (draft.name) setWorkoutName(draft.name);
          setExercises(draft.exs);
        }
      }
    });
  }, [userId, cycleDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft to localStorage on every change — including after the workout is
  // logged. The draft stores loggedWorkoutId so the mount logic can detect that these
  // edits belong to an already-persisted workout and prefer them over the DB row.
  // This protects against: token refresh, screen lock/wake, browser background eviction.
  useEffect(() => {
    const hasContent = exercises.some(e => e.name.trim() || e.sets.some(s => s.reps || s.weight || s.durationMin || s.distanceKm));
    if (hasContent) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        name: workoutName,
        exs: exercises,
        loggedWorkoutId: loggedWorkoutId ?? null,
      }));
    }
  }, [exercises, workoutName, loggedWorkoutId]);

  // ── Exercise handlers ──────────────────────────────────────────────────
  const addEx = () => setExercises(p => [...p, newEx()]);

  // If the first slot is still empty (placeholder), replace it — otherwise append
  function addNamed(name: string) {
    const exType: InputType = getExerciseInputTypeByName(name);
    setExercises(p => {
      if (p.length === 1 && !p[0].name.trim() && p[0].sets.every(s => !s.reps && !s.weight && !s.durationMin && !s.distanceKm)) {
        return [{ ...p[0], name, exType }];
      }
      return [...p, newEx(name, exType)];
    });
  }

  const addSuggested = (n: string) => addNamed(n);
  const addFromLibrary = (n: string) => { addNamed(n); setShowLibrary(false); };
  const removeEx = (id: string) => setExercises(p => p.filter(e => e.id !== id));
  const updateExName = (id: string, name: string) => setExercises(p => p.map(e => e.id === id ? { ...e, name, exType: getExerciseInputTypeByName(name) } : e));
  const addSet = (eid: string) => setExercises(p => p.map(e => {
    if (e.id !== eid) return e;
    const last = e.sets[e.sets.length - 1];
    const copied: SetRow = last
      ? { id: crypto.randomUUID(), reps: last.reps, weight: last.weight, durationMin: last.durationMin, distanceKm: last.distanceKm }
      : newSet();
    return { ...e, sets: [...e.sets, copied] };
  }));
  const removeSet = (eid: string, sid: string) => setExercises(p => p.map(e => e.id === eid ? { ...e, sets: e.sets.filter(s => s.id !== sid) } : e));
  const updateSet = (eid: string, sid: string, f: "reps" | "weight" | "durationMin" | "distanceKm", v: string) =>
    setExercises(p => p.map(e => e.id === eid ? { ...e, sets: e.sets.map(s => s.id === sid ? { ...s, [f]: v } : s) } : e));

  // Load template into current workout
  function loadTemplate(t: WorkoutTemplate) {
    setWorkoutName(t.name);
    setExercises(
      (t.exercises as unknown as { name: string; sets: { reps: string; weight: string; durationMin?: string; distanceKm?: string }[] }[]).map(e => ({
        id: crypto.randomUUID(),
        name: e.name,
        exType: getExerciseInputTypeByName(e.name),
        sets: e.sets.map(s => ({ id: crypto.randomUUID(), reps: s.reps ?? "", weight: s.weight ?? "", durationMin: s.durationMin, distanceKm: s.distanceKm })),
      }))
    );
    setShowTemplates(false);
  }

  function handleUseIntelligenceWorkout(exs: IntelligenceWorkoutExercise[]) {
    const exRows: ExRow[] = exs.map(e => ({
      id: crypto.randomUUID(),
      name: e.name,
      exType: getExerciseInputTypeByName(e.name),
      sets: e.sets.map(s => ({ id: crypto.randomUUID(), reps: s.reps, weight: s.weight })),
    }));
    setExercises(exRows);
  }

  async function handleSave() {
    setSaveStatus("loading");
    // Smart name fallback: user's name → first exercise → phase default
    const firstEx = exercises.find(e => e.name.trim())?.name.trim();
    const smartName = workoutName.trim() || (firstEx ? `${firstEx} day` : `${phaseData.phase} workout`);
    const payload: Workout = {
      name: smartName,
      cycle_day: cycleDay,
      phase: phaseData.phase,
      workout_type: resolvedWorkoutType ?? undefined,
      exercises: exercises.map(e => ({
        name: e.name,
        sets: e.sets.map(s => ({
          reps: s.reps, weight: s.weight,
          durationMin: s.durationMin, distanceKm: s.distanceKm,
        })),
      })),
    };

    let result;
    if (loggedWorkoutId) {
      // Update existing workout
      result = await updateWorkout(loggedWorkoutId, payload);
    } else {
      // New workout — insert
      result = await saveWorkout(payload);
      if (result.success && result.id) {
        setLoggedWorkoutId(result.id);
        // Update draft to reference this workout ID so subsequent edits are protected
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          name: smartName,
          exs: exercises,
          loggedWorkoutId: result.id,
        }));
      }
    }

    if (result.success) {
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2500);

      // ── Auto-detect PRs ─────────────────────────────────────────────
      // Fetch current bests, compare each set, save new PRs automatically
      const currentBests = await getBestPRPerExercise();
      const bestsMap: Record<string, number> = {};
      for (const pr of currentBests) {
        bestsMap[pr.exercise.toLowerCase()] = pr.weight;
      }
      const detectedPRs: string[] = [];
      for (const ex of exercises) {
        if (!ex.name.trim() || ex.exType !== "weight_reps") continue;
        const key = ex.name.trim().toLowerCase();
        const bestSet = ex.sets.reduce((best, s) => {
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps) || 0;
          return w > (parseFloat(best.weight) || 0) ? s : best;
        }, ex.sets[0]);
        if (!bestSet) continue;
        const w = parseFloat(bestSet.weight) || 0;
        const r = parseInt(bestSet.reps) || 0;
        if (w > 0 && r > 0 && (!bestsMap[key] || w > bestsMap[key])) {
          await savePR({
            exercise: ex.name.trim(),
            reps: r,
            weight: w,
            phase: phaseData.phase,
            cycle_day: cycleDay,
          });
          detectedPRs.push(ex.name.trim());
        }
      }
      if (detectedPRs.length > 0) {
        setNewPRs(detectedPRs);
        setTimeout(() => setNewPRs([]), 4000);
      }
      // ────────────────────────────────────────────────────────────────
    } else {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    const t: WorkoutTemplate = {
      name: workoutName || `${phaseData.phase} template`,
      phase: phaseData.phase,
      exercises: exercises.map(e => ({
        name: e.name,
        sets: e.sets.map(s => ({
          reps: s.reps, weight: s.weight,
          durationMin: s.durationMin, distanceKm: s.distanceKm,
        })),
      })),
    };
    await saveWorkoutTemplate(t);
    const updated = await getWorkoutTemplates();
    setTemplates(updated);
    setSavingTemplate(false);
  }

  async function handleDeleteTemplate(id: number) {
    await deleteWorkoutTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    setConfirmDeleteId(null);
  }

  const totalSets = exercises.reduce((a, e) => a + e.sets.length, 0);
  const totalVolume = exercises.reduce((a, e) => a + e.sets.reduce((s, r) => s + (parseFloat(r.reps) || 0) * (parseFloat(r.weight) || 0), 0), 0);

  if (loading || !user) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="fixed top-0 left-0 right-0 h-48 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(196,138,151,0.15) 0%, transparent 70%)" }} />

      <main className="relative z-10 mx-auto max-w-app px-4 pt-6">

        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-secondary font-semibold uppercase tracking-widest mb-1">Workout</p>
            <h1 className="font-display text-2xl font-semibold text-dark">Today's Workout</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold border transition-all active:scale-95"
              style={{ borderColor: "rgba(196,138,151,0.3)", color: "#C48A97", background: showTemplates ? "rgba(196,138,151,0.08)" : "var(--color-surface)" }}>
              📋 Templates {templates.length > 0 ? `(${templates.length})` : ""}
            </button>
          </div>
        </header>

        {/* Templates panel */}
        {showTemplates && (
          <div className="bg-surface rounded-2xl shadow-card mb-4 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-dark">Saved Templates</p>
              <button
                onClick={() => { setShowTemplates(false); setShowTemplateForm(true); }}
                disabled={savingTemplate}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                Save current →
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="px-4 pb-4 text-center">
                <p className="text-dark/30 text-xs font-body py-4">No saved workouts yet. Build a workout and save it!</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-dark font-semibold text-sm truncate">{t.name}</p>
                      <p className="text-dark/40 text-xs font-body">
                        {(t.exercises as unknown as {name:string}[]).length} exercises · {t.phase}
                      </p>
                    </div>
                    <button
                      onClick={() => loadTemplate(t)}
                      className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-xl transition-all active:scale-95"
                      style={{ background: "rgba(196,138,151,0.1)" }}>
                      Load
                    </button>
                    {confirmDeleteId === t.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDeleteTemplate(t.id!)}
                          className="text-xs font-bold text-rose-500 px-2 py-1 rounded-lg bg-rose-50 active:scale-95">
                          Delete
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="text-xs font-bold text-dark/40 px-2 py-1 rounded-lg bg-ghost active:scale-95">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(t.id!)}
                        className="text-dark/20 hover:text-rose-400 transition-colors text-lg leading-none ml-1">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECOMMENDATION CARD — TodayState or phase fallback ── */}
        {todayState ? (
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)", borderLeft: `3px solid ${phaseColor}` }}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{phaseData.emoji}</span>
                <div>
                  <p className="text-white/40 text-xs font-body uppercase tracking-widest">
                    {phaseData.phase} phase · Day {cycleDay}
                    {todayState.adaptedFromCheckin && " · personalised"}
                  </p>
                  <p className="text-white font-semibold text-sm">{todayState.workoutRecommendation.type}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}>
                  {todayState.workoutRecommendation.intensity}
                </span>
                {todayState.workoutRecommendation.duration > 0 && (
                  <span className="text-xs font-body" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {todayState.workoutRecommendation.duration} min
                  </span>
                )}
              </div>
            </div>
            {/* Reasoning */}
            <p className="text-white/60 text-xs font-body leading-relaxed">
              {todayState.workoutRecommendation.reasoning}
            </p>
          </div>
        ) : (
          /* Fallback — original rotating phase banner */
          <div className="rounded-2xl p-4 mb-4"
            style={{ background: "linear-gradient(135deg, #2A2330, #3D3248)", borderLeft: `3px solid ${phaseColor}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{phaseData.emoji}</span>
                <div>
                  <p className="text-white/40 text-xs font-body uppercase tracking-widest">{phaseData.phase} phase · Day {cycleDay}</p>
                  <p className="text-white font-semibold text-sm">{todayMsg.title}</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                {todayMsg.category}
              </span>
            </div>
            <p className="text-white/60 text-xs font-body leading-relaxed mb-2">{todayMsg.detail}</p>
            <div className="flex gap-1.5">
              {msgs.map((_, i) => (
                <div key={i} className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: i === msgIdx ? 16 : 6,
                    background: i === msgIdx ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.15)",
                  }} />
              ))}
            </div>
          </div>
        )}

        {/* ── TRAINING INTELLIGENCE CARD — collapsible, below phase card ── */}
        <TrainingIntelligenceCard
          onWorkoutTypeResolved={setResolvedWorkoutType}
          onUseWorkout={handleUseIntelligenceWorkout}
        />

        {/* Suggested + Library — same row, easy access right after phase context */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
              {todayState?.adaptedFromCheckin ? "Recommended for you" : `Suggested for ${phaseData.phase} phase`}
            </p>
            <button onClick={() => setShowLibrary(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
              <span style={{ fontSize: 12 }}>📚</span> Full library
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(todayState?.workoutRecommendation.exercises?.length
              ? todayState.workoutRecommendation.exercises
              : suggestedExercises[phaseData.phase]
            ).map((s) => (
              <button key={s} onClick={() => addSuggested(s)}
                className="text-xs px-3 py-1.5 rounded-full font-medium border transition-all active:scale-95"
                style={{ borderColor: "rgba(196,138,151,0.3)", color: "#C48A97", background: "rgba(196,138,151,0.07)" }}>
                + {s}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise list */}
        <div className="space-y-3 mb-4">
          {exercises.map((exercise, exIdx) => (
            <div key={exercise.id} className="bg-surface rounded-2xl shadow-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--color-border)]">
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>{exIdx + 1}</span>
                <input type="text" placeholder="Exercise name…" value={exercise.name}
                  onChange={(e) => updateExName(exercise.id, e.target.value)}
                  className="flex-1 text-dark font-semibold text-sm outline-none placeholder:text-dark/30 bg-transparent font-body" />
                <button onClick={() => removeEx(exercise.id)} className="text-dark/20 hover:text-rose-400 transition-colors text-lg leading-none">×</button>
              </div>
              <div className="px-4 py-3">
                {/* ── weight_reps: Reps + Weight ── */}
                {exercise.exType === "weight_reps" && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <span className="w-7" />
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Reps</span>
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Weight (kg)</span>
                      <span className="w-6" />
                    </div>
                    {exercise.sets.map((set, si) => (
                      <div key={set.id} className="flex items-center gap-2 mb-2">
                        <span className="w-7 text-center text-xs font-semibold text-dark/30">{si + 1}</span>
                        <input type="number" placeholder="12" value={set.reps}
                          onChange={(e) => updateSet(exercise.id, set.id, "reps", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="1" />
                        <input type="number" placeholder="50" value={set.weight}
                          onChange={(e) => updateSet(exercise.id, set.id, "weight", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="0" step="0.5" />
                        <button onClick={() => removeSet(exercise.id, set.id)} className="w-6 text-dark/20 hover:text-rose-400 transition-colors text-base leading-none">×</button>
                      </div>
                    ))}
                  </>
                )}
                {/* ── reps_only: Reps (no weight) ── */}
                {exercise.exType === "reps_only" && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <span className="w-7" />
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Reps</span>
                      <span className="w-6" />
                    </div>
                    {exercise.sets.map((set, si) => (
                      <div key={set.id} className="flex items-center gap-2 mb-2">
                        <span className="w-7 text-center text-xs font-semibold text-dark/30">{si + 1}</span>
                        <input type="number" placeholder="10" value={set.reps}
                          onChange={(e) => updateSet(exercise.id, set.id, "reps", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="1" />
                        <button onClick={() => removeSet(exercise.id, set.id)} className="w-6 text-dark/20 hover:text-rose-400 transition-colors text-base leading-none">×</button>
                      </div>
                    ))}
                  </>
                )}
                {/* ── duration_only: Duration (min) ── */}
                {exercise.exType === "duration_only" && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <span className="w-7" />
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Duration (min)</span>
                      <span className="w-6" />
                    </div>
                    {exercise.sets.map((set, si) => (
                      <div key={set.id} className="flex items-center gap-2 mb-2">
                        <span className="w-7 text-center text-xs font-semibold text-dark/30">{si + 1}</span>
                        <input type="number" placeholder="30" value={set.durationMin ?? ""}
                          onChange={(e) => updateSet(exercise.id, set.id, "durationMin", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="1" />
                        <button onClick={() => removeSet(exercise.id, set.id)} className="w-6 text-dark/20 hover:text-rose-400 transition-colors text-base leading-none">×</button>
                      </div>
                    ))}
                  </>
                )}
                {/* ── duration_distance: Duration (min) + Distance (km) ── */}
                {exercise.exType === "duration_distance" && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <span className="w-7" />
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Duration (min)</span>
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Distance (km)</span>
                      <span className="w-6" />
                    </div>
                    {exercise.sets.map((set, si) => (
                      <div key={set.id} className="flex items-center gap-2 mb-2">
                        <span className="w-7 text-center text-xs font-semibold text-dark/30">{si + 1}</span>
                        <input type="number" placeholder="30" value={set.durationMin ?? ""}
                          onChange={(e) => updateSet(exercise.id, set.id, "durationMin", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="1" />
                        <input type="number" placeholder="5.0" value={set.distanceKm ?? ""}
                          onChange={(e) => updateSet(exercise.id, set.id, "distanceKm", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="0" step="0.1" />
                        <button onClick={() => removeSet(exercise.id, set.id)} className="w-6 text-dark/20 hover:text-rose-400 transition-colors text-base leading-none">×</button>
                      </div>
                    ))}
                  </>
                )}
                {/* ── weight_distance: Weight (kg) + Distance (m) ── */}
                {exercise.exType === "weight_distance" && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <span className="w-7" />
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Weight (kg)</span>
                      <span className="flex-1 text-center text-xs font-semibold text-dark/40 uppercase tracking-wide">Distance (m)</span>
                      <span className="w-6" />
                    </div>
                    {exercise.sets.map((set, si) => (
                      <div key={set.id} className="flex items-center gap-2 mb-2">
                        <span className="w-7 text-center text-xs font-semibold text-dark/30">{si + 1}</span>
                        <input type="number" placeholder="24" value={set.weight}
                          onChange={(e) => updateSet(exercise.id, set.id, "weight", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="0" step="0.5" />
                        <input type="number" placeholder="20" value={set.distanceKm ?? ""}
                          onChange={(e) => updateSet(exercise.id, set.id, "distanceKm", e.target.value)}
                          className="flex-1 text-center bg-background rounded-xl py-2 text-sm font-semibold text-dark outline-none border border-transparent focus:border-primary/30 transition-colors font-body" min="0" step="1" />
                        <button onClick={() => removeSet(exercise.id, set.id)} className="w-6 text-dark/20 hover:text-rose-400 transition-colors text-base leading-none">×</button>
                      </div>
                    ))}
                  </>
                )}
                <button onClick={() => addSet(exercise.id)}
                  className="w-full text-xs text-primary font-semibold py-1.5 rounded-xl border border-dashed transition-all active:scale-95 mt-1"
                  style={{ borderColor: "rgba(196,138,151,0.3)" }}>+ Add set</button>
              </div>
            </div>
          ))}
        </div>

        {/* Add exercise — opens library for search/browse */}
        <button onClick={() => setShowLibrary(true)}
          className="w-full mb-4 py-3.5 rounded-2xl text-sm font-semibold border-2 border-dashed transition-all active:scale-95"
          style={{ borderColor: "rgba(196,138,151,0.3)", color: "#C48A97" }}>
          + Add exercise
        </button>

        {/* Stats */}
        {totalSets > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{ label: "Exercises", value: exercises.length }, { label: "Total Sets", value: totalSets }, { label: "Volume kg", value: totalVolume > 0 ? totalVolume.toLocaleString() : "—" }]
              .map((s) => (
                <div key={s.label} className="bg-surface rounded-2xl p-3 text-center shadow-card">
                  <p className="font-display font-bold text-xl text-dark">{s.value}</p>
                  <p className="text-xs text-dark/40 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
          </div>
        )}

        {/* Save buttons */}
        {loggedWorkoutId && saveStatus === "idle" && (
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-3"
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}>
            <span className="text-lg flex-shrink-0">✅</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700">Workout logged today</p>
              <p className="text-xs text-emerald-600/70 font-body">You can keep editing and updating until midnight.</p>
            </div>
          </div>
        )}
        {/* PR toast notification */}
        {newPRs.length > 0 && (
          <div className="mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-up"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)" }}>
            <span className="text-2xl flex-shrink-0">🏆</span>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: "#FBBF24" }}>New PR{newPRs.length > 1 ? "s" : ""} detected!</p>
              <p className="text-xs font-body" style={{ color: "var(--color-text-mid)" }}>{newPRs.join(", ")} — automatically saved</p>
            </div>
          </div>
        )}

        {/* Save for future use — name input only shown when user opts in */}
        {showTemplateForm && (
          <div className="bg-surface rounded-2xl shadow-card px-4 py-4 mb-3">
            <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">Name this workout</p>
            <input
              type="text"
              placeholder="e.g. Push Day A, Lower Body…"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              autoFocus
              className="w-full text-dark font-body text-sm outline-none placeholder:text-dark/30 bg-background rounded-xl px-3 py-2.5 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplateForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-dark/40 bg-ghost active:scale-95 transition-all">
                Cancel
              </button>
              <button
                onClick={async () => { await handleSaveTemplate(); setShowTemplateForm(false); }}
                disabled={savingTemplate}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
                {savingTemplate ? "Saving…" : "Save for later"}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button onClick={() => setShowTemplateForm(v => !v)}
            disabled={savingTemplate}
            className="py-4 px-4 rounded-2xl text-sm font-semibold border-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ borderColor: "rgba(196,138,151,0.4)", color: showTemplateForm ? "var(--color-text-dim)" : "#C48A97", background: showTemplateForm ? "var(--color-ghost)" : "var(--color-surface)" }}>
            {showTemplateForm ? "✕" : "📋 Save Workout"}
          </button>
          <button onClick={handleSave}
            disabled={saveStatus === "loading" || !exercises.some(e => e.name.trim())}
            className="flex-1 py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 shadow-soft disabled:opacity-50"
            style={{ background: saveStatus === "success" ? "linear-gradient(135deg, #34D399, #10B981)" : saveStatus === "error" ? "linear-gradient(135deg, #F87171, #EF4444)" : "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
            {saveStatus === "loading" ? (loggedWorkoutId ? "Updating…" : "Logging…")
              : saveStatus === "success" ? (loggedWorkoutId ? "✓ Updated!" : "✓ Logged!")
              : saveStatus === "error" ? "✗ Retry"
              : loggedWorkoutId ? "Update Workout" : "Log Workout"}
          </button>
        </div>

        {/* Logged today indicator */}
        {loggedWorkoutId && saveStatus === "idle" && (
          <p className="text-center text-xs text-emerald-500 font-semibold mb-4">
            ✓ Logged today · you can keep editing until midnight
          </p>
        )}
      </main>

      {showLibrary && (
        <ExerciseLibrary currentPhase={phaseData.phase} onAdd={addFromLibrary} onClose={() => setShowLibrary(false)} />
      )}
    </div>
  );
}
