"use client";

// app/training/builder/page.tsx — Workout template list

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import PageSkeleton from "@/components/PageSkeleton";
import {
  getTemplates,
  saveNewTemplate,
  deleteNewTemplate,
  type NewWorkoutTemplate,
} from "@/lib/workoutSessions";

// ── Phase tag colours ──────────────────────────────────────────────────────────
const PHASE_CHIP: Record<string, { bg: string; text: string }> = {
  menstrual:  { bg: "rgba(248,113,113,0.15)",  text: "#F87171" },
  follicular: { bg: "rgba(52,211,153,0.15)",   text: "#34D399" },
  ovulation:  { bg: "rgba(251,191,36,0.15)",   text: "#FBBF24" },
  luteal:     { bg: "rgba(167,139,250,0.15)",  text: "#A78BFA" },
};

const PHASE_LABEL: Record<string, string> = {
  menstrual:  "Menstrual",
  follicular: "Follicular",
  ovulation:  "Ovulation",
  luteal:     "Luteal",
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WorkoutBuilderListPage() {
  const router = useRouter();
  const { user, loading } = useApp();

  const [templates, setTemplates]           = useState<NewWorkoutTemplate[]>([]);
  const [dataLoading, setDataLoading]       = useState(true);
  const [creating, setCreating]             = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // ── Auth redirect ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  // ── Load templates ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    getTemplates().then((data) => {
      setTemplates(data);
      setDataLoading(false);
    });
  }, [user]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    const result = await saveNewTemplate({
      name: "New Template",
      phase_tags: [],
      exercises: [],
    });
    setCreating(false);
    if (result.success && result.id) {
      router.push(`/training/builder/${result.id}`);
    }
  }

  async function handleDelete(id: number) {
    await deleteNewTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setConfirmDeleteId(null);
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading) return <PageSkeleton />;

  return (
    <div className="min-h-dvh bg-background pb-28">
      {/* Fixed radial gradient glow — rose, same as other pages */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          height: 320,
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(196,138,151,0.18) 0%, transparent 80%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 px-4 pt-6 mx-auto max-w-app">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6">
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
                Training
              </p>
              <h1 className="text-2xl font-bold text-dark leading-tight">My Workouts</h1>
            </div>
          </div>

          {/* + New button */}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-card transition-opacity"
            style={{
              background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
              opacity: creating ? 0.6 : 1,
            }}
          >
            {creating ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              "+"
            )}
            New
          </button>
        </div>

        {/* ── Content ── */}
        {dataLoading ? (
          // Skeleton cards
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ background: "var(--color-surface)" }}
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <span className="text-5xl">🏋️</span>
            <p className="text-dark/60 text-base font-medium">No templates yet</p>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-card transition-opacity"
              style={{
                background: "linear-gradient(135deg, #C48A97, #7B6D8D)",
                opacity: creating ? 0.6 : 1,
              }}
            >
              Create first template
            </button>
          </div>
        ) : (
          // Template list
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-surface rounded-2xl p-4 shadow-card"
                style={{ border: "1px solid var(--color-border)" }}
              >
                {/* Name + exercise count */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-dark text-base leading-snug truncate">
                      {t.name}
                    </p>
                    <p className="text-xs text-dark/50 mt-0.5">
                      {t.exercises.length === 0
                        ? "No exercises"
                        : t.exercises.length === 1
                        ? "1 exercise"
                        : `${t.exercises.length} exercises`}
                    </p>
                  </div>

                  {/* Action buttons — or delete confirm */}
                  {confirmDeleteId === t.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white"
                        style={{ background: "#F87171" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-dark/70"
                        style={{ background: "var(--color-border)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Edit */}
                      <button
                        onClick={() => router.push(`/training/builder/${t.id}`)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-sm text-dark/50 hover:text-primary transition-colors"
                        style={{ background: "var(--color-border)" }}
                        aria-label="Edit template"
                        title="Edit"
                      >
                        ✎
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setConfirmDeleteId(t.id)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-sm text-dark/50 hover:text-red-400 transition-colors"
                        style={{ background: "var(--color-border)" }}
                        aria-label="Delete template"
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Phase tag chips */}
                {t.phase_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.phase_tags.map((tag) => {
                      const style = PHASE_CHIP[tag] ?? { bg: "rgba(156,163,175,0.15)", text: "#9CA3AF" };
                      const label = PHASE_LABEL[tag] ?? tag;
                      return (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Start button */}
                <button
                  onClick={() => router.push(`/training/session/${t.id}`)}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white shadow-card"
                  style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
                >
                  Start →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
