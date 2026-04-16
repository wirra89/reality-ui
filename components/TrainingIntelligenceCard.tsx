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
  recovery: "bg-blue-500/20 text-blue-300",
  light:    "bg-green-500/20 text-green-300",
  moderate: "bg-yellow-500/20 text-yellow-300",
  high:     "bg-orange-500/20 text-orange-300",
  peak:     "bg-red-500/20 text-red-300",
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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md mb-4 overflow-hidden">

      {/* ── Collapsed header (always visible, clickable) ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left active:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Today's Training Recommendation</p>
            <p className="font-semibold text-white text-sm leading-tight">{workoutDef.name}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${INTENSITY_COLOR[primaryIntensity] ?? "bg-white/10 text-white/60"}`}>
            {primaryIntensity}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded content ── */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10">

          {/* Description + match reasons */}
          <div className="pt-3 space-y-2">
            <p className="text-sm text-white/60">{workoutDef.description}</p>
            {recommendation.primary.matchReasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recommendation.primary.matchReasons.map(r => (
                  <span key={r} className="text-xs bg-white/10 border border-white/10 text-white/60 px-2.5 py-0.5 rounded-full">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Exercise rows with inputs */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-widest">Exercises</p>

            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : exerciseRows.length === 0 ? (
              <p className="text-sm text-white/40 italic">No matching exercises for this phase.</p>
            ) : (
              exerciseRows.map(row => {
                const inp = inputs[row.exercise.id] ?? { sets: "3", reps: "8", weight: "" };
                const bodyweight = isBodyweight(row.exercise);
                return (
                  <div key={row.exercise.id} className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                    {/* Exercise name + muscle */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white text-sm">{row.exercise.name}</p>
                        <p className="text-xs text-white/40 capitalize">
                          {row.exercise.muscle} · {row.exercise.equipment}
                        </p>
                        {row.lastLog && row.lastLog.sets_data.length > 0 && (
                          <p className="text-xs text-white/30 mt-0.5">
                            Last: {row.lastLog.sets_data.length}×{row.lastLog.sets_data[0].reps}
                            {row.lastLog.sets_data[0].weight > 0 ? ` @ ${row.lastLog.sets_data[0].weight}kg` : ""}
                          </p>
                        )}
                        {row.isFirstSession && (
                          <p className="text-xs text-white/30 mt-0.5">First session — choose your weight</p>
                        )}
                      </div>
                    </div>

                    {/* Input row: Sets · Reps · Weight */}
                    <div className={`grid gap-2 ${bodyweight ? "grid-cols-2" : "grid-cols-3"}`}>
                      <div>
                        <p className="text-xs text-white/40 text-center mb-1">Sets</p>
                        <input
                          type="number" min="1" max="10"
                          value={inp.sets}
                          onChange={e => updateInput(row.exercise.id, "sets", e.target.value)}
                          className="w-full text-center rounded-xl py-2 text-sm font-semibold text-white bg-white/10 border border-white/10 focus:border-white/30 outline-none transition-colors"
                          placeholder="3"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-white/40 text-center mb-1">Reps</p>
                        <input
                          type="number" min="1"
                          value={inp.reps}
                          onChange={e => updateInput(row.exercise.id, "reps", e.target.value)}
                          className="w-full text-center rounded-xl py-2 text-sm font-semibold text-white bg-white/10 border border-white/10 focus:border-white/30 outline-none transition-colors"
                          placeholder="8"
                        />
                      </div>
                      {!bodyweight && (
                        <div>
                          <p className="text-xs text-white/40 text-center mb-1">kg</p>
                          <input
                            type="number" min="0" step="0.5"
                            value={inp.weight}
                            onChange={e => updateInput(row.exercise.id, "weight", e.target.value)}
                            className="w-full text-center rounded-xl py-2 text-sm font-semibold text-white bg-white/10 border border-white/10 focus:border-white/30 outline-none transition-colors"
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
            <p className="text-xs text-white/30 text-center">
              Alternative: <span className="text-white/50">{WORKOUT_TYPES[recommendation.fallback.workoutTypeId].name}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
