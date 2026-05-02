"use client";

// app/training/session/[templateId]/page.tsx
// Active workout session page — loads a template, tracks sets in real time,
// and saves as completed or abandoned on exit.

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import PageSkeleton from "@/components/PageSkeleton";
import WorkoutExerciseRow from "@/components/WorkoutExerciseRow";
import {
  getTemplate,
  enrichWithLastSession,
  saveSession,
  type SessionExercise,
  type SessionSet,
  type ActiveSession,
} from "@/lib/workoutSessions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, cycleDay, cycleParams } = useApp();

  const templateId = parseInt(params.templateId as string, 10);

  // ── Session state ──────────────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState<string>("");
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // ── Elapsed timer ──────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // Start timer on mount, clear on unmount
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Auth redirect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  // ── Load template on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !user) return;

    async function load() {
      const template = await getTemplate(templateId);
      if (!template) {
        router.replace("/training/builder");
        return;
      }

      setTemplateName(template.name);

      // Build raw SessionExercise[] from template exercises
      const raw: SessionExercise[] = template.exercises.map((ex) => ({
        exercise_id: ex.exercise_id,
        name: ex.name,
        note: ex.note,
        sets: Array.from({ length: ex.default_sets }, (): SessionSet => ({
          reps: null,
          weight: null,
          done: false,
        })),
      }));

      // Enrich with last-session comparison data
      const enriched = await enrichWithLastSession(raw);
      setExercises(enriched);
      setSessionLoading(false);
    }

    load();
  }, [loading, user, templateId, router]);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const totalCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const doneCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.done).length,
    0
  );

  // ── Build ActiveSession helper ─────────────────────────────────────────────
  const buildSession = useCallback((): ActiveSession => ({
    templateId,
    templateName,
    startedAt: startedAtRef.current,
    exercises,
  }), [templateId, templateName, exercises]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSetUpdate = useCallback(
    (exIdx: number, setIdx: number, field: "reps" | "weight", value: number | null) => {
      setExercises((prev) => {
        const next = prev.map((ex, ei) => {
          if (ei !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === setIdx ? { ...s, [field]: value } : s
            ),
          };
        });
        return next;
      });
    },
    []
  );

  const handleSetToggle = useCallback((exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si === setIdx ? { ...s, done: !s.done } : s
          ),
        };
      })
    );
  }, []);

  const handleAddSet = useCallback((exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        const newSet: SessionSet = {
          reps: last?.reps ?? null,
          weight: last?.weight ?? null,
          done: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  }, []);

  const handleAddExercise = useCallback(() => {
    setExercises((prev) => [
      ...prev,
      {
        name: "New Exercise",
        sets: [{ reps: null, weight: null, done: false }],
      },
    ]);
  }, []);

  const phaseData = getPhaseData(cycleDay, cycleParams);

  const handleAbandon = async () => {
    if (saving) return;
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);
    await saveSession(buildSession(), "abandoned", cycleDay, phaseData.phase);
    router.replace("/training");
  };

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);
    await saveSession(buildSession(), "completed", cycleDay, phaseData.phase);
    router.replace("/training");
  };

  // ── Loading states ─────────────────────────────────────────────────────────
  if (loading || sessionLoading) return <PageSkeleton />;

  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh pb-32"
      style={{ background: "var(--color-bg, #FDF5F6)" }}
    >
      {/* ── Fixed radial glow background ──────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,138,151,0.18) 0%, transparent 70%)",
        }}
      />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-4 pt-safe-top"
        style={{
          background: "rgba(253,245,246,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--color-border, #F5DEE2)",
        }}
      >
        <div className="max-w-app mx-auto">
          <div className="flex items-center gap-3 py-3">
            {/* Abandon / back button */}
            <button
              type="button"
              onClick={() => setShowAbandonConfirm(true)}
              disabled={saving}
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50 disabled:opacity-40"
              style={{
                background: "var(--color-surface, #fff)",
                border: "1.5px solid var(--color-border, #F5DEE2)",
                color: "#C48A97",
                fontSize: 18,
              }}
              aria-label="Abandon workout"
            >
              ←
            </button>

            {/* Template name */}
            <div className="flex-1 min-w-0">
              <p
                className="font-display font-bold text-dark text-base leading-tight truncate"
                title={templateName}
              >
                {templateName}
              </p>
              {/* Set count */}
              <p
                className="text-xs font-body mt-0.5"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                {doneCount}/{totalCount} sets
              </p>
            </div>

            {/* Elapsed timer */}
            <div
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-body font-semibold tabular-nums"
              style={{
                background: "rgba(196,138,151,0.1)",
                color: "#C48A97",
              }}
            >
              {formatElapsed(elapsed)}
            </div>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full mb-3 overflow-hidden"
            style={{ background: "rgba(196,138,151,0.15)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #C48A97, #7B6D8D)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Exercise list ──────────────────────────────────────────────────── */}
      <div className="max-w-app mx-auto px-4 pt-4">
        {exercises.map((ex, ei) => (
          <WorkoutExerciseRow
            key={ei}
            exercise={ex}
            exerciseIndex={ei}
            onSetUpdate={handleSetUpdate}
            onSetToggle={handleSetToggle}
            onAddSet={handleAddSet}
          />
        ))}

        {/* ── Add exercise dashed button ───────────────────────────────── */}
        <button
          type="button"
          onClick={handleAddExercise}
          className="w-full py-3 rounded-2xl text-sm font-body font-semibold mb-6 transition-opacity hover:opacity-70 active:opacity-50"
          style={{
            border: "1.5px dashed var(--color-border, #F5DEE2)",
            color: "#C48A97",
            background: "transparent",
          }}
        >
          + Add exercise
        </button>
      </div>

      {/* ── Abandon confirmation modal ────────────────────────────────────── */}
      {showAbandonConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowAbandonConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl mb-2"
            style={{ background: "var(--color-surface, #fff)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-semibold text-dark text-center mb-1">Abandon workout?</p>
            <p className="text-xs text-dark/40 font-body text-center mb-5">
              Your progress so far will be saved as an abandoned session.
            </p>
            <button
              onClick={handleAbandon}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mb-2.5 transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #F87171, #EF4444)" }}
            >
              Abandon
            </button>
            <button
              onClick={() => setShowAbandonConfirm(false)}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: "rgba(196,138,151,0.1)", color: "#C48A97" }}
            >
              Keep training
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Finish button ───────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe-bottom"
        style={{
          background: "rgba(253,245,246,0.96)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderTop: "1px solid var(--color-border, #F5DEE2)",
        }}
      >
        <div className="max-w-app mx-auto py-3">
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="w-full py-4 rounded-2xl text-base font-display font-bold text-white transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
              boxShadow: "0 4px 20px rgba(196,138,151,0.45)",
            }}
          >
            {saving ? "Saving…" : "Finish Workout ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
