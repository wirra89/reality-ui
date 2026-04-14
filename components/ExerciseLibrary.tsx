"use client";

// components/ExerciseLibrary.tsx
import { useState, useMemo } from "react";
import {
  EXERCISES,
  MUSCLE_LABELS,
  MUSCLE_EMOJIS,
  DIFFICULTY_COLORS,
  type MuscleGroup,
  type Exercise,
} from "@/lib/exercises";
import { type Phase } from "@/lib/cycle";

const MUSCLES: MuscleGroup[] = [
  "chest", "back", "shoulders", "arms", "glutes", "legs", "core", "cardio",
];

const PHASE_COLORS: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
  all:        "var(--color-text-dim)",
};

interface Props {
  currentPhase: Phase;
  onAdd: (exerciseName: string) => void;
  onClose: () => void;
}

export default function ExerciseLibrary({ currentPhase, onAdd, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | "all">("all");
  const [phaseFilter, setPhaseFilter] = useState<"all" | "recommended">("recommended");

  const filtered = useMemo(() => {
    let list = EXERCISES;

    if (selectedMuscle !== "all") {
      list = list.filter((e) => e.muscle === selectedMuscle);
    }

    if (phaseFilter === "recommended") {
      list = list.filter(
        (e) => e.phases.includes(currentPhase) || e.phases.includes("all")
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q));
    }

    return list;
  }, [search, selectedMuscle, phaseFilter, currentPhase]);

  const grouped = useMemo(() => {
    if (selectedMuscle !== "all") return null;
    const groups: Partial<Record<MuscleGroup, Exercise[]>> = {};
    for (const ex of filtered) {
      if (!groups[ex.muscle]) groups[ex.muscle] = [];
      groups[ex.muscle]!.push(ex);
    }
    return groups;
  }, [filtered, selectedMuscle]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(42,35,48,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Sheet */}
      <div
        className="relative flex flex-col rounded-t-3xl overflow-hidden mx-auto w-full max-w-app"
        style={{
          background: "var(--color-surface)",
          maxHeight: "88dvh",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-dark/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-xl text-dark">
              Exercise Library
            </h2>
            <p className="text-xs text-secondary font-body">
              {filtered.length} exercises · {currentPhase} phase
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface shadow-card flex items-center justify-center text-dark/40 hover:text-dark transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 mb-3 flex-shrink-0">
          <div className="bg-surface rounded-2xl flex items-center gap-2 px-3 py-2.5 shadow-card">
            <svg className="w-4 h-4 text-dark/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm text-dark outline-none bg-transparent placeholder:text-dark/30 font-body"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-dark/30 hover:text-dark text-lg leading-none">×</button>
            )}
          </div>
        </div>

        {/* Phase filter toggle */}
        <div className="px-4 mb-3 flex-shrink-0">
          <div className="flex rounded-2xl bg-surface p-1 shadow-card gap-1">
            {(["recommended", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setPhaseFilter(f)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all duration-200"
                style={{
                  background: phaseFilter === f ? "linear-gradient(135deg, #C48A97, #7B6D8D)" : "transparent",
                  color: phaseFilter === f ? "var(--color-surface)" : "var(--color-text-dim)",
                }}
              >
                {f === "recommended" ? `✦ For ${currentPhase}` : "All exercises"}
              </button>
            ))}
          </div>
        </div>

        {/* Muscle group pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 px-4 mb-3 flex-shrink-0 scrollbar-none">
          <MuscleChip
            label="All"
            emoji="🔍"
            active={selectedMuscle === "all"}
            onClick={() => setSelectedMuscle("all")}
          />
          {MUSCLES.map((m) => (
            <MuscleChip
              key={m}
              label={MUSCLE_LABELS[m].split(" / ")[0]}
              emoji={MUSCLE_EMOJIS[m]}
              active={selectedMuscle === m}
              onClick={() => setSelectedMuscle(m)}
            />
          ))}
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-dark/30">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm font-body">No exercises found</p>
            </div>
          ) : grouped ? (
            // Grouped view (all muscles)
            Object.entries(grouped).map(([muscle, exercises]) => (
              <div key={muscle} className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{MUSCLE_EMOJIS[muscle as MuscleGroup]}</span>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    {MUSCLE_LABELS[muscle as MuscleGroup]}
                  </p>
                  <span className="text-xs text-dark/30">({exercises!.length})</span>
                </div>
                <div className="space-y-2">
                  {exercises!.map((ex) => (
                    <ExerciseCard key={ex.id} exercise={ex} currentPhase={currentPhase} onAdd={onAdd} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Flat list (single muscle)
            <div className="space-y-2">
              {filtered.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} currentPhase={currentPhase} onAdd={onAdd} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MuscleChip({ label, emoji, active, onClick }: {
  label: string; emoji: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
      style={{
        background: active ? "linear-gradient(135deg, #C48A97, #7B6D8D)" : "var(--color-surface)",
        color: active ? "var(--color-surface)" : "var(--color-text-mid)",
        boxShadow: active ? "0 2px 8px rgba(196,138,151,0.3)" : "0 1px 4px rgba(var(--color-text-rgb),0.06)",
      }}
    >
      <span>{emoji}</span>
      {label}
    </button>
  );
}

function ExerciseCard({ exercise, currentPhase, onAdd }: {
  exercise: Exercise;
  currentPhase: Phase;
  onAdd: (name: string) => void;
}) {
  const diff = DIFFICULTY_COLORS[exercise.difficulty];
  const isRecommended =
    exercise.phases.includes(currentPhase) || exercise.phases.includes("all");

  return (
    <div
      className="bg-surface rounded-2xl px-4 py-3 shadow-card"
      style={{
        border: isRecommended ? "1.5px solid rgba(196,138,151,0.25)" : "1.5px solid transparent",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + recommended badge */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-dark font-semibold text-sm">{exercise.name}</p>
            {isRecommended && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(196,138,151,0.15)", color: "#C48A97" }}>
                ✦ NOW
              </span>
            )}
          </div>

          {/* Tip */}
          <p className="text-dark/50 text-xs font-body leading-relaxed mb-2">
            {exercise.tips}
          </p>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Difficulty */}
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{ background: diff.bg, color: diff.text }}
            >
              {exercise.difficulty}
            </span>
            {/* Equipment */}
            <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ background: "var(--color-ghost)", color: "var(--color-text-mid)" }}>
              {exercise.equipment}
            </span>
            {/* Phase dots */}
            {exercise.phases.map((p) => p !== "all" && (
              <span
                key={p}
                className="w-2 h-2 rounded-full"
                title={p}
                style={{ background: PHASE_COLORS[p] }}
              />
            ))}
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => onAdd(exercise.name)}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg transition-all active:scale-90 shadow-soft"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          +
        </button>
      </div>
    </div>
  );
}
