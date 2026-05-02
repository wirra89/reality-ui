"use client";

// app/training/session/quick/page.tsx
// Ad-hoc "Quick Workout" session — user names exercises inline, tracks sets,
// and optionally saves the session as a reusable template when done.

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getPhaseData } from "@/lib/cycle";
import PageSkeleton from "@/components/PageSkeleton";
import {
  saveSession,
  saveNewTemplate,
  type SessionSet,
  type ActiveSession,
} from "@/lib/workoutSessions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuickExercise {
  name: string;
  sets: SessionSet[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuickWorkoutPage() {
  const router = useRouter();
  const { user, loading, cycleDay, cycleParams } = useApp();

  // ── Session state ──────────────────────────────────────────────────────────
  const [exercises, setExercises] = useState<QuickExercise[]>([
    { name: "", sets: [{ reps: null, weight: null, done: false }] },
  ]);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const startedAt = useRef(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ── Derived counts ─────────────────────────────────────────────────────────
  const totalCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const doneCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.done).length,
    0
  );
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const addExercise = useCallback(() => {
    setExercises((prev) => [
      ...prev,
      { name: "", sets: [{ reps: null, weight: null, done: false }] },
    ]);
  }, []);

  const updateExerciseName = useCallback((idx: number, name: string) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === idx ? { ...ex, name } : ex))
    );
  }, []);

  const removeExercise = useCallback((exIdx: number) => {
    setExercises((prev) => {
      if (prev.length <= 1) return prev; // keep at least 1
      return prev.filter((_, i) => i !== exIdx);
    });
  }, []);

  const addSet = useCallback((exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
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

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: "reps" | "weight", value: number | null) => {
      setExercises((prev) =>
        prev.map((ex, i) => {
          if (i !== exIdx) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === setIdx ? { ...s, [field]: value } : s
            ),
          };
        })
      );
    },
    []
  );

  const toggleSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, si) =>
            si === setIdx ? { ...s, done: !s.done } : s
          ),
        };
      })
    );
  }, []);

  // ── Abandon (discard without saving) ──────────────────────────────────────
  const handleAbandon = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    router.replace("/training");
  }, [router]);

  // ── Finish flow ────────────────────────────────────────────────────────────

  const phaseData = getPhaseData(cycleDay, cycleParams);

  const handleFinish = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const session: ActiveSession = {
      templateId: null,
      templateName: "Quick Workout",
      startedAt: startedAt.current,
      exercises: exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets,
      })),
    };

    await saveSession(session, "completed", cycleDay, phaseData.phase);
    setSaving(false);
    setShowSaveModal(true);
  }, [saving, exercises, cycleDay, phaseData.phase]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (savingTemplate) return;
    setSavingTemplate(true);
    await saveNewTemplate({
      name: templateName || "Quick Workout",
      phase_tags: [],
      exercises: exercises.map((ex, i) => ({
        name: ex.name,
        order_index: i,
        default_sets: ex.sets.length,
        default_rep_range: "8-12",
      })),
    });
    router.replace("/training");
  }, [savingTemplate, templateName, exercises, router]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return <PageSkeleton />;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh pb-32"
      style={{ background: "var(--color-bg, #FDF5F6)" }}
    >
      {/* ── Fixed radial glow background ────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,138,151,0.18) 0%, transparent 70%)",
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
            {/* Back button */}
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
              aria-label="Back to training"
            >
              ←
            </button>

            {/* Title / set count */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-body font-semibold uppercase tracking-widest"
                style={{ color: "rgba(0,0,0,0.35)" }}
              >
                Quick Workout
              </p>
              <p
                className="text-xs font-body mt-0.5"
                style={{ color: "rgba(0,0,0,0.4)" }}
              >
                {doneCount}/{totalCount} sets done
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

      {/* ── Exercise list ────────────────────────────────────────────────────── */}
      <div className="max-w-app mx-auto px-4 pt-4">
        {exercises.map((ex, exIdx) => (
          <div
            key={exIdx}
            className="rounded-2xl mb-3 overflow-hidden"
            style={{
              background: "var(--color-surface)",
              boxShadow:
                "0 0 0 1px var(--color-border, #F5DEE2), 0 2px 8px rgba(180,80,100,0.07)",
            }}
          >
            {/* ── Exercise header: numbered badge + editable name + remove ── */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--color-border, #F5DEE2)" }}
            >
              {/* Numbered gradient badge */}
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold text-white"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
              >
                {exIdx + 1}
              </span>

              {/* Editable name input */}
              <input
                type="text"
                value={ex.name}
                onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                placeholder="Exercise name…"
                className="flex-1 bg-transparent outline-none text-sm font-display font-semibold text-dark placeholder:font-body"
                style={{
                  color: "var(--color-text)",
                  caretColor: "#C48A97",
                }}
              />

              {/* Remove button (only when more than 1 exercise) */}
              {exercises.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExercise(exIdx)}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
                  style={{
                    background: "rgba(196,138,151,0.1)",
                    color: "#C48A97",
                    fontSize: 14,
                  }}
                  aria-label={`Remove exercise ${exIdx + 1}`}
                >
                  ×
                </button>
              )}
            </div>

            {/* ── Column labels ─────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-body"
              style={{ color: "rgba(0,0,0,0.35)" }}
            >
              <span className="w-5 text-center">#</span>
              <span className="flex-1 text-center">kg</span>
              <span className="w-4 text-center">×</span>
              <span className="flex-1 text-center">Reps</span>
              {/* Spacer for toggle column */}
              <span className="w-8" />
            </div>

            {/* ── Set rows ──────────────────────────────────────────────────── */}
            <div className="px-3 pb-1">
              {ex.sets.map((set, si) => {
                const isDone = set.done;
                return (
                  <div key={si} className="flex items-center gap-2 py-2">
                    {/* Set number */}
                    <span
                      className="w-5 text-center text-xs font-body font-semibold"
                      style={{ color: "rgba(0,0,0,0.3)" }}
                    >
                      {si + 1}
                    </span>

                    {/* Weight input */}
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={set.weight ?? ""}
                      onChange={(e) =>
                        updateSet(
                          exIdx,
                          si,
                          "weight",
                          e.target.value === "" ? null : parseFloat(e.target.value)
                        )
                      }
                      className="flex-1 text-center text-sm font-body rounded-xl py-1.5 outline-none border"
                      style={{
                        background: isDone
                          ? "rgba(34,197,94,0.06)"
                          : "var(--color-bg, #F5E8EB)",
                        borderColor: isDone
                          ? "rgba(34,197,94,0.3)"
                          : "var(--color-border, #F5DEE2)",
                        color: "var(--color-text)",
                        opacity: isDone ? 0.6 : 1,
                      }}
                    />

                    {/* × separator */}
                    <span
                      className="w-4 text-center text-sm font-body"
                      style={{ color: "rgba(0,0,0,0.3)" }}
                    >
                      ×
                    </span>

                    {/* Reps input */}
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={set.reps ?? ""}
                      onChange={(e) =>
                        updateSet(
                          exIdx,
                          si,
                          "reps",
                          e.target.value === "" ? null : parseInt(e.target.value, 10)
                        )
                      }
                      className="flex-1 text-center text-sm font-body rounded-xl py-1.5 outline-none border"
                      style={{
                        background: isDone
                          ? "rgba(34,197,94,0.06)"
                          : "var(--color-bg, #F5E8EB)",
                        borderColor: isDone
                          ? "rgba(34,197,94,0.3)"
                          : "var(--color-border, #F5DEE2)",
                        color: "var(--color-text)",
                        opacity: isDone ? 0.6 : 1,
                      }}
                    />

                    {/* Done toggle */}
                    <button
                      type="button"
                      onClick={() => toggleSet(exIdx, si)}
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={
                        isDone
                          ? {
                              background: "linear-gradient(135deg, #22c55e, #16a34a)",
                              color: "#fff",
                              boxShadow: "0 2px 6px rgba(34,197,94,0.35)",
                            }
                          : {
                              background: "var(--color-bg, #F5E8EB)",
                              border: "1.5px solid var(--color-border, #F5DEE2)",
                              color: "rgba(0,0,0,0.25)",
                            }
                      }
                    >
                      {isDone ? "✓" : ""}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* ── Add set button ────────────────────────────────────────────── */}
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => addSet(exIdx)}
                className="w-full py-2 rounded-xl text-sm font-body font-semibold transition-opacity hover:opacity-70 active:opacity-50"
                style={{
                  border: "1.5px dashed var(--color-border, #F5DEE2)",
                  color: "#C48A97",
                  background: "transparent",
                }}
              >
                + Add set
              </button>
            </div>
          </div>
        ))}

        {/* ── Add exercise button ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={addExercise}
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

      {/* ── Sticky Finish button ─────────────────────────────────────────────── */}
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

      {/* ── Abandon confirmation modal ──────────────────────────────────────── */}
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
              This session won&apos;t be saved.
            </p>
            <button
              onClick={handleAbandon}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white mb-2.5 transition-all active:scale-95"
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

      {/* ── Save-as-template modal ───────────────────────────────────────────── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <div
            className="w-full max-w-app rounded-t-3xl px-6 pt-6 pb-safe-bottom"
            style={{
              background: "var(--color-surface, #fff)",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Drag handle */}
            <div
              className="w-10 h-1 rounded-full mx-auto mb-5"
              style={{ background: "rgba(0,0,0,0.12)" }}
            />

            {/* Heading */}
            <h2 className="font-display font-bold text-dark text-xl text-center mb-1">
              Great session! 💪
            </h2>
            <p
              className="font-body text-sm text-center mb-6"
              style={{ color: "rgba(0,0,0,0.45)" }}
            >
              Save this as a template to track progress next time?
            </p>

            {/* Template name input */}
            <div
              className="rounded-2xl px-4 py-3 mb-4"
              style={{
                background: "var(--color-bg, #FDF5F6)",
                border: "1.5px solid var(--color-border, #F5DEE2)",
              }}
            >
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name (e.g. Push Day)"
                className="w-full bg-transparent outline-none text-sm font-body text-dark"
                style={{
                  color: "var(--color-text)",
                  caretColor: "#C48A97",
                }}
              />
            </div>

            {/* Save as template button */}
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate}
              className="w-full py-4 rounded-2xl text-base font-display font-bold text-white mb-3 transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
                boxShadow: "0 4px 20px rgba(196,138,151,0.35)",
              }}
            >
              {savingTemplate ? "Saving…" : "Save as template"}
            </button>

            {/* Keep as one-time session button */}
            <button
              type="button"
              onClick={() => router.replace("/training")}
              className="w-full py-3 text-sm font-body font-semibold transition-opacity hover:opacity-70 active:opacity-50"
              style={{ color: "rgba(0,0,0,0.4)" }}
            >
              Keep as one-time session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
