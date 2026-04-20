"use client";

// app/training/builder/[id]/page.tsx — Workout template editor

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import PageSkeleton from "@/components/PageSkeleton";
import {
  getTemplate,
  saveNewTemplate,
  type NewWorkoutTemplate,
  type TemplateExercise,
} from "@/lib/workoutSessions";

// ── Phase tag colours ──────────────────────────────────────────────────────────

const PHASES = ["menstrual", "follicular", "ovulation", "luteal"] as const;
type Phase = (typeof PHASES)[number];

const PHASE_LABEL: Record<Phase, string> = {
  menstrual:  "Menstrual",
  follicular: "Follicular",
  ovulation:  "Ovulation",
  luteal:     "Luteal",
};

const PHASE_COLOR: Record<Phase, { active: string; text: string; inactive: string }> = {
  menstrual:  { active: "#F87171", text: "#FFFFFF", inactive: "rgba(248,113,113,0.12)" },
  follicular: { active: "#34D399", text: "#FFFFFF", inactive: "rgba(52,211,153,0.12)"  },
  ovulation:  { active: "#FBBF24", text: "#FFFFFF", inactive: "rgba(251,191,36,0.12)"  },
  luteal:     { active: "#A78BFA", text: "#FFFFFF", inactive: "rgba(167,139,250,0.12)" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function newExercise(orderIndex: number): TemplateExercise {
  return {
    name: "",
    order_index: orderIndex,
    default_sets: 3,
    default_rep_range: "8-12",
  };
}

// ── Page ───────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function TemplateEditorPage() {
  const router   = useRouter();
  const params   = useParams();
  const id       = parseInt(params.id as string, 10);
  const { user, loading } = useApp();

  // ── Template state ─────────────────────────────────────────────────────────
  const [name,      setName]      = useState("");
  const [phaseTags, setPhaseTags] = useState<string[]>([]);
  const [exercises, setExercises] = useState<TemplateExercise[]>([newExercise(0)]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [pageLoading, setPageLoading] = useState(true);
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>("idle");

  // ── Debounce ref (not state — avoids re-render cycles) ─────────────────────
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth redirect ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  // ── Load template on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !id || isNaN(id)) return;
    setPageLoading(true);
    getTemplate(id).then((template: NewWorkoutTemplate | null) => {
      if (!template) {
        router.replace("/training/builder");
        return;
      }
      setName(template.name);
      setPhaseTags(template.phase_tags ?? []);
      const exs = template.exercises.length > 0
        ? template.exercises
        : [newExercise(0)];
      setExercises(exs);
      setPageLoading(false);
    });
  }, [user, id, router]);

  // ── Auto-save (debounced 800ms) ───────────────────────────────────────────────
  const triggerSave = useCallback(
    (nextName: string, nextTags: string[], nextExercises: TemplateExercise[]) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setSaveStatus("saving");

      debounceTimer.current = setTimeout(async () => {
        const result = await saveNewTemplate({
          id,
          name: nextName,
          phase_tags: nextTags,
          exercises: nextExercises,
        });

        if (savedStatusRef.current) clearTimeout(savedStatusRef.current);

        if (result.success) {
          setSaveStatus("saved");
          savedStatusRef.current = setTimeout(() => setSaveStatus("idle"), 1500);
        } else {
          setSaveStatus("error");
          savedStatusRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
        }
      }, 800);
    },
    [id]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current)  clearTimeout(debounceTimer.current);
      if (savedStatusRef.current) clearTimeout(savedStatusRef.current);
    };
  }, []);

  // ── Change handlers ────────────────────────────────────────────────────────

  function handleNameChange(val: string) {
    setName(val);
    triggerSave(val, phaseTags, exercises);
  }

  function togglePhaseTag(phase: string) {
    const next = phaseTags.includes(phase)
      ? phaseTags.filter((p) => p !== phase)
      : [...phaseTags, phase];
    setPhaseTags(next);
    triggerSave(name, next, exercises);
  }

  function updateExercises(next: TemplateExercise[]) {
    setExercises(next);
    triggerSave(name, phaseTags, next);
  }

  function handleExerciseField(
    idx: number,
    field: keyof TemplateExercise,
    value: string | number
  ) {
    const next = exercises.map((ex, i) =>
      i === idx ? { ...ex, [field]: value } : ex
    );
    updateExercises(next);
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...exercises];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    // Reindex order_index
    updateExercises(next.map((ex, i) => ({ ...ex, order_index: i })));
  }

  function moveDown(idx: number) {
    if (idx === exercises.length - 1) return;
    const next = [...exercises];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    updateExercises(next.map((ex, i) => ({ ...ex, order_index: i })));
  }

  function removeExercise(idx: number) {
    let next = exercises.filter((_, i) => i !== idx);
    if (next.length === 0) next = [newExercise(0)];
    updateExercises(next.map((ex, i) => ({ ...ex, order_index: i })));
  }

  function addExercise() {
    updateExercises([...exercises, newExercise(exercises.length)]);
  }

  // ── Save status label ──────────────────────────────────────────────────────

  const saveLabel =
    saveStatus === "saving" ? "Saving…"
    : saveStatus === "saved"  ? "Saved ✓"
    : saveStatus === "error"  ? "Error"
    : "";

  const saveLabelColor =
    saveStatus === "saved"  ? "#34D399"
    : saveStatus === "error"  ? "#F87171"
    : "var(--color-text-dim)";

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading || pageLoading) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background pb-32">
      {/* Fixed radial glow */}
      <div
        aria-hidden
        style={{
          position:     "fixed",
          top:          0,
          left:         "50%",
          transform:    "translateX(-50%)",
          width:        "100%",
          maxWidth:     480,
          height:       320,
          background:   "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(196,138,151,0.18) 0%, transparent 80%)",
          pointerEvents:"none",
          zIndex:       0,
        }}
      />

      <div className="relative z-10 px-4 pt-6 mx-auto max-w-app">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 rounded-full text-dark/60 hover:text-dark transition-colors"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              aria-label="Go back"
            >
              ←
            </button>

            <div>
              <p className="text-xs font-medium tracking-widest uppercase text-primary opacity-70 mb-0.5">
                Edit Template
              </p>
              <h1 className="text-xl font-bold text-dark leading-tight truncate max-w-[200px]">
                {name || "Untitled"}
              </h1>
            </div>
          </div>

          {/* Auto-save status */}
          <span
            className="text-xs font-semibold transition-all"
            style={{ color: saveLabelColor, minWidth: 60, textAlign: "right" }}
          >
            {saveLabel}
          </span>
        </div>

        {/* ── Template name card ── */}
        <div
          className="bg-surface rounded-2xl p-4 shadow-card mb-3"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-2">
            Template name
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Full Body Strength"
            className="w-full text-base font-semibold text-dark bg-background rounded-xl px-3 py-2.5 outline-none font-body"
            style={{ border: "1px solid var(--color-border)" }}
          />
        </div>

        {/* ── Phase tags card ── */}
        <div
          className="bg-surface rounded-2xl p-4 shadow-card mb-3"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-3">
            Phase tags
          </p>
          <div className="flex flex-wrap gap-2">
            {PHASES.map((phase) => {
              const selected = phaseTags.includes(phase);
              const c = PHASE_COLOR[phase];
              return (
                <button
                  key={phase}
                  onClick={() => togglePhaseTag(phase)}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: selected ? c.active : c.inactive,
                    color:      selected ? c.text   : c.active,
                    border:     `1.5px solid ${c.active}`,
                    opacity:    selected ? 1 : 0.75,
                  }}
                >
                  {PHASE_LABEL[phase]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Exercises ── */}
        <div className="space-y-3 mb-3">
          {exercises.map((ex, idx) => (
            <div
              key={idx}
              className="bg-surface rounded-2xl p-4 shadow-card"
              style={{ border: "1px solid var(--color-border)" }}
            >
              {/* Exercise header row */}
              <div className="flex items-center gap-2 mb-3">
                {/* Numbered gradient badge */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
                >
                  {idx + 1}
                </div>

                {/* Name input */}
                <input
                  type="text"
                  value={ex.name}
                  onChange={(e) => handleExerciseField(idx, "name", e.target.value)}
                  placeholder="Exercise name"
                  className="flex-1 text-sm font-semibold text-dark bg-background rounded-xl px-3 py-2 outline-none font-body min-w-0"
                  style={{ border: "1px solid var(--color-border)" }}
                />

                {/* Reorder buttons */}
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-dark/40 disabled:opacity-20 transition-all active:scale-90"
                  style={{ background: "var(--color-border)" }}
                  aria-label="Move up"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === exercises.length - 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-dark/40 disabled:opacity-20 transition-all active:scale-90"
                  style={{ background: "var(--color-border)" }}
                  aria-label="Move down"
                  title="Move down"
                >
                  ↓
                </button>

                {/* Remove button */}
                <button
                  onClick={() => removeExercise(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm text-dark/30 hover:text-rose-400 transition-colors"
                  style={{ background: "var(--color-border)" }}
                  aria-label="Remove exercise"
                  title="Remove"
                >
                  ×
                </button>
              </div>

              {/* 3 inline inputs: sets / rep range / note */}
              <div className="grid grid-cols-3 gap-2">
                {/* Sets */}
                <div>
                  <p className="text-xs text-dark/40 font-body mb-1 text-center">Sets</p>
                  <input
                    type="number"
                    value={ex.default_sets}
                    onChange={(e) =>
                      handleExerciseField(idx, "default_sets", parseInt(e.target.value, 10) || 1)
                    }
                    min={1}
                    max={20}
                    className="w-full text-sm font-bold text-dark text-center bg-background rounded-xl px-2 py-2 outline-none"
                    style={{ border: "1px solid var(--color-border)" }}
                  />
                </div>

                {/* Rep range */}
                <div>
                  <p className="text-xs text-dark/40 font-body mb-1 text-center">Reps</p>
                  <input
                    type="text"
                    value={ex.default_rep_range}
                    onChange={(e) =>
                      handleExerciseField(idx, "default_rep_range", e.target.value)
                    }
                    placeholder="8-12"
                    className="w-full text-sm font-semibold text-dark text-center bg-background rounded-xl px-2 py-2 outline-none font-body"
                    style={{ border: "1px solid var(--color-border)" }}
                  />
                </div>

                {/* Note */}
                <div>
                  <p className="text-xs text-dark/40 font-body mb-1 text-center">Note</p>
                  <input
                    type="text"
                    value={ex.note ?? ""}
                    onChange={(e) =>
                      handleExerciseField(idx, "note", e.target.value)
                    }
                    placeholder="optional"
                    className="w-full text-xs text-dark text-center bg-background rounded-xl px-2 py-2 outline-none font-body"
                    style={{ border: "1px solid var(--color-border)" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Add exercise button ── */}
        <button
          onClick={addExercise}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-primary transition-all active:scale-95 mb-4"
          style={{
            border:     "1.5px dashed var(--color-border)",
            background: "transparent",
          }}
        >
          + Add exercise
        </button>

        {/* ── Start session CTA ── */}
        <button
          onClick={() => router.push(`/training/session/${id}`)}
          className="w-full py-4 rounded-2xl text-base font-bold text-white shadow-card transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          Start session with this template →
        </button>
      </div>
    </div>
  );
}
