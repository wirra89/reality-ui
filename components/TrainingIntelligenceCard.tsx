"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getPhase } from "@/lib/cycle";
import { scoreWorkoutTypes, buildTrainingInput, WORKOUT_TYPES } from "@/lib/trainingEngine";
import type { WorkoutTypeId } from "@/lib/trainingEngine";
import { selectExercisesForWorkout } from "@/lib/exerciseSelector";
import { computeProgressionTargets } from "@/lib/progressionEngine";
import { getExerciseHistory } from "@/lib/trainingQueries";
import type { ExerciseLog } from "@/lib/trainingQueries";
import type { Exercise } from "@/lib/exercises";
import { getRecentWorkouts } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExerciseWithTargets {
  exercise:       Exercise;
  lastLog:        ExerciseLog | null;
  targetSets:     number;
  targetReps:     number;
  targetWeight:   number;
  isFirstSession: boolean;
  suggestion:     string;
}

interface ExInput { sets: string; reps: string; weight: string; }

export interface IntelligenceWorkoutExercise {
  name: string;
  sets: Array<{ reps: string; weight: string }>;
}

interface Props {
  onWorkoutTypeResolved?: (workoutTypeId: WorkoutTypeId) => void;
  onUseWorkout?: (exercises: IntelligenceWorkoutExercise[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTENSITY_COLOR: Record<string, string> = {
  recovery: "bg-blue-100 text-blue-700",
  light:    "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  high:     "bg-orange-100 text-orange-700",
  peak:     "bg-red-100 text-red-700",
};

const PHASE_BAND_BG: Record<string, string> = {
  menstrual:  "#FEE2E2",
  follicular: "#D1FAE5",
  ovulation:  "#FEF3C7",
  luteal:     "#EDE9FE",
};
const PHASE_BAND_TEXT: Record<string, string> = {
  menstrual:  "#B91C1C",
  follicular: "#065F46",
  ovulation:  "#92400E",
  luteal:     "#5B21B6",
};
const PHASE_DOT: Record<string, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TrainingIntelligenceCard({ onWorkoutTypeResolved, onUseWorkout }: Props) {
  const { dailySignals, cycleDay, cycleParams } = useApp();
  const [exerciseRows, setExerciseRows]     = useState<ExerciseWithTargets[]>([]);
  const [inputs, setInputs]                 = useState<Record<string, ExInput>>({});
  const [loading, setLoading]               = useState(true);
  const [isOpen, setIsOpen]                 = useState(false);
  const [recentTypes, setRecentTypes]       = useState<WorkoutTypeId[]>([]);


  // Load recent workout types so repeat penalty creates daily variety
  useEffect(() => {
    getRecentWorkouts(7).then(workouts => {
      const types = workouts
        .map(w => w.workout_type)
        .filter((t): t is WorkoutTypeId => !!t);
      setRecentTypes(types);
    }).catch(() => { /* unauthenticated — stay empty */ });
  }, []);

  const trainingInput = buildTrainingInput({
    phase:              dailySignals?.phase ?? getPhase(cycleDay ?? 1, cycleParams),
    cycleDay:           dailySignals?.cycleDay ?? cycleDay ?? 1,
    readinessScore:     dailySignals?.readinessScore ?? 60,
    readinessLabel:     dailySignals?.readinessLabel ?? "moderate",
    symptoms:           dailySignals?.symptomFlags   ?? [],
    goal:               dailySignals?.primaryGoal    ?? null,
    energy:             dailySignals?.energy         ?? null,
    equipmentLevel:     "gym",
    availableMinutes:   60,
    recentWorkoutTypes: recentTypes,
  });

  const phase           = trainingInput.phase;
  const readinessLabel  = trainingInput.readinessLabel;

  const recommendation = scoreWorkoutTypes(trainingInput);
  const workoutTypeId  = recommendation.primary.workoutTypeId;
  const workoutDef     = WORKOUT_TYPES[workoutTypeId];
  const primaryIntensity = recommendation.primary.intensity;

  useEffect(() => {
    onWorkoutTypeResolved?.(workoutTypeId);
  }, [workoutTypeId, onWorkoutTypeResolved]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const selected = selectExercisesForWorkout(workoutTypeId, phase, { limit: 5 });
      const rows = await Promise.all(
        selected.map(async (exercise): Promise<ExerciseWithTargets> => {
          let lastLog: ExerciseLog | null = null;
          try {
            const history = await getExerciseHistory(exercise.name, phase, 1);
            lastLog = history[0] ?? null;
          } catch { /* unauthenticated or no data */ }
          const targets = computeProgressionTargets(exercise.name, lastLog, readinessLabel, phase);
          return { exercise, lastLog, ...targets };
        })
      );

      if (!cancelled) {
        setExerciseRows(rows);
        // Pre-fill inputs from progression targets
        const initial: Record<string, ExInput> = {};
        for (const row of rows) {
          initial[row.exercise.id] = {
            sets:   String(row.targetSets),
            reps:   String(row.targetReps),
            weight: row.targetWeight > 0 ? String(row.targetWeight) : "",
          };
        }
        setInputs(initial);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [workoutTypeId, phase, readinessLabel]);

  function updateInput(exId: string, field: keyof ExInput, value: string) {
    setInputs(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }));
  }

  function handleStart() {
    const result: IntelligenceWorkoutExercise[] = exerciseRows.map(row => {
      const inp = inputs[row.exercise.id] ?? { sets: "3", reps: "8", weight: "" };
      const numSets = Math.max(1, parseInt(inp.sets) || row.targetSets);
      return {
        name: row.exercise.name,
        sets: Array.from({ length: numSets }, () => ({
          reps:   inp.reps || String(row.targetReps),
          weight: inp.weight || "",
        })),
      };
    });
    onUseWorkout?.(result);
    setIsOpen(false);
  }

  const isBodyweight = (ex: Exercise) =>
    ex.equipment === "bodyweight" || ex.equipment === "other" || !ex.equipment;

  const bandBg   = PHASE_BAND_BG[phase]   ?? "#D1FAE5";
  const bandText = PHASE_BAND_TEXT[phase] ?? "#065F46";
  const dotColor = PHASE_DOT[phase]       ?? "#34D399";

  return (
    <div className="rounded-2xl shadow-card mb-4 overflow-hidden" style={{ background: "var(--color-surface)" }}>

      {/* ── Phase band ── */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: bandBg }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />
          <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: bandText }}>
            {phase} phase
          </span>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${INTENSITY_COLOR[primaryIntensity] ?? ""}`}>
          {primaryIntensity}
        </span>
      </div>

      {/* ── Collapsed header (always visible, clickable) ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left active:bg-ghost transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-widest mb-0.5">Today's Recommendation</p>
            <p className="font-semibold text-dark text-sm leading-tight">{workoutDef.name}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-[var(--color-text-dim)] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded content ── */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--color-border)]">

          {/* Description + match reasons */}
          <div className="pt-3 space-y-2">
            <p className="text-sm text-[var(--color-text-mid)]">{workoutDef.description}</p>
            {recommendation.primary.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recommendation.primary.matchReasons.map(r => (
                  <span key={r} className="text-xs bg-ghost border border-[var(--color-border)] text-[var(--color-text-mid)] px-2.5 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Exercise rows with inputs */}
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-dim)] uppercase tracking-widest">Exercises</p>

            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-ghost animate-pulse" />
                ))}
              </div>
            ) : exerciseRows.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)] italic">No matching exercises for this phase.</p>
            ) : (
              exerciseRows.map(row => {
                const inp = inputs[row.exercise.id] ?? { sets: "3", reps: "8", weight: "" };
                const bodyweight = isBodyweight(row.exercise);
                return (
                  <div key={row.exercise.id} className="rounded-xl bg-ghost border border-[var(--color-border)] p-3 space-y-2">
                    {/* Exercise name + muscle */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-dark text-sm">{row.exercise.name}</p>
                        <p className="text-xs text-[var(--color-text-dim)] capitalize">
                          {row.exercise.muscle} · {row.exercise.equipment}
                        </p>
                        {row.lastLog && row.lastLog.sets_data.length > 0 && (
                          <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
                            Last: {row.lastLog.sets_data.length}×{row.lastLog.sets_data[0].reps}
                            {row.lastLog.sets_data[0].weight > 0 ? ` @ ${row.lastLog.sets_data[0].weight}kg` : ""}
                          </p>
                        )}
                        {row.isFirstSession && (
                          <p className="text-xs text-[var(--color-text-dim)] mt-0.5">First session — choose your weight</p>
                        )}
                      </div>
                    </div>

                    {/* Input row: Sets · Reps · Weight */}
                    <div className={`grid gap-2 ${bodyweight ? "grid-cols-2" : "grid-cols-3"}`}>
                      <div>
                        <p className="text-xs text-[var(--color-text-dim)] text-center mb-1">Sets</p>
                        <input
                          type="number" min="1" max="10"
                          value={inp.sets}
                          onChange={e => updateInput(row.exercise.id, "sets", e.target.value)}
                          className="w-full text-center rounded-xl py-2 text-sm font-semibold text-dark bg-ghost border border-[var(--color-border)] focus:border-primary outline-none transition-colors"
                          placeholder="3"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-dim)] text-center mb-1">Reps</p>
                        <input
                          type="number" min="1"
                          value={inp.reps}
                          onChange={e => updateInput(row.exercise.id, "reps", e.target.value)}
                          className="w-full text-center rounded-xl py-2 text-sm font-semibold text-dark bg-ghost border border-[var(--color-border)] focus:border-primary outline-none transition-colors"
                          placeholder="8"
                        />
                      </div>
                      {!bodyweight && (
                        <div>
                          <p className="text-xs text-[var(--color-text-dim)] text-center mb-1">kg</p>
                          <input
                            type="number" min="0" step="0.5"
                            value={inp.weight}
                            onChange={e => updateInput(row.exercise.id, "weight", e.target.value)}
                            className="w-full text-center rounded-xl py-2 text-sm font-semibold text-dark bg-ghost border border-[var(--color-border)] focus:border-primary outline-none transition-colors"
                            placeholder={row.targetWeight > 0 ? String(row.targetWeight) : "kg"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          {!loading && exerciseRows.length > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleStart}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
              >
                Use this workout ↓
              </button>
            </div>
          )}

          {/* Fallback suggestion */}
          {recommendation.fallback && (
            <p className="text-xs text-[var(--color-text-dim)] text-center">
              Alternative: <span className="text-[var(--color-text-mid)]">{WORKOUT_TYPES[recommendation.fallback.workoutTypeId].name}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
