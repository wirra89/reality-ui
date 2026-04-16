"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getPhase } from "@/lib/cycle";
import { scoreWorkoutTypes, buildTrainingInput, WORKOUT_TYPES } from "@/lib/trainingEngine";
import type { WorkoutTypeId } from "@/lib/trainingEngine";
import { selectExercisesForWorkout } from "@/lib/exerciseSelector";
import { computeProgressionTargets, detectWinCondition } from "@/lib/progressionEngine";
import type { ReadinessLabel } from "@/lib/progressionEngine";
import { getExerciseHistory } from "@/lib/trainingQueries";
import type { ExerciseLog } from "@/lib/trainingQueries";
import type { Exercise } from "@/lib/exercises";

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

interface Props {
  onWorkoutTypeResolved?: (workoutTypeId: WorkoutTypeId) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTENSITY_COLOR: Record<string, string> = {
  recovery: "bg-blue-500/30 text-blue-300",
  light:    "bg-green-500/30 text-green-300",
  moderate: "bg-yellow-500/30 text-yellow-300",
  high:     "bg-orange-500/30 text-orange-300",
  peak:     "bg-red-500/30 text-red-300",
};

const WIN_LABELS: Record<string, { label: string; color: string }> = {
  weight_pr:    { label: "Weight PR!", color: "text-yellow-300" },
  volume_pr:    { label: "Volume PR!", color: "text-purple-300" },
  rep_pr:       { label: "Rep PR!",    color: "text-green-300" },
  effort_match: { label: "Matched",   color: "text-blue-300" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function TrainingIntelligenceCard({ onWorkoutTypeResolved }: Props) {
  const { todayState, cycleDay, cycleParams, profile } = useApp();
  const [exerciseRows, setExerciseRows] = useState<ExerciseWithTargets[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive phase from cycleDay + cycleParams (CycleParams has no currentPhase field)
  const phase = getPhase(cycleDay ?? 1, cycleParams);
  const readinessScore = todayState?.readinessScore ?? 60;
  const readinessLabel = (todayState?.readinessLabel ?? "moderate") as ReadinessLabel;

  // Profile has goals: string[] and body_goal?: string — no single "goal" field
  const goal = profile?.body_goal ?? profile?.goals?.[0] ?? null;

  const trainingInput = buildTrainingInput({
    phase,
    cycleDay:            cycleDay ?? 1,
    readinessScore,
    readinessLabel,
    symptoms:            [],
    goal,
    energy:              null,
    equipmentLevel:      "gym",
    availableMinutes:    60,
    recentWorkoutTypes:  [],
  });

  const recommendation = scoreWorkoutTypes(trainingInput);
  const workoutTypeId  = recommendation.primary.workoutTypeId;
  const workoutDef     = WORKOUT_TYPES[workoutTypeId];

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
          } catch {
            // unauthenticated or no data — ignore
          }
          const targets = computeProgressionTargets(exercise.name, lastLog, readinessLabel, phase);
          return { exercise, lastLog, ...targets };
        })
      );

      if (!cancelled) {
        setExerciseRows(rows);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [workoutTypeId, phase, readinessLabel]);

  const primaryIntensity = recommendation.primary.intensity;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Today&apos;s Workout</p>
          <h3 className="text-lg font-semibold text-white">{workoutDef.name}</h3>
          <p className="text-sm text-white/60 mt-0.5">{workoutDef.description}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize shrink-0 ${INTENSITY_COLOR[primaryIntensity] ?? "bg-white/10 text-white/60"}`}>
          {primaryIntensity}
        </span>
      </div>

      {/* Match reasons */}
      {recommendation.primary.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recommendation.primary.matchReasons.map(r => (
            <span key={r} className="text-xs bg-white/10 border border-white/10 text-white/70 px-2.5 py-0.5 rounded-full">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">Exercises</p>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : exerciseRows.length === 0 ? (
          <p className="text-sm text-white/40 italic">No matching exercises for this phase.</p>
        ) : (
          exerciseRows.map(({ exercise, targetSets, targetReps, targetWeight, isFirstSession, lastLog }) => {
            const winKey = lastLog ? detectWinCondition(lastLog.sets_data, lastLog) : null;
            const win = winKey ? WIN_LABELS[winKey] : null;

            return (
              <div key={exercise.id} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-sm truncate">{exercise.name}</p>
                    {win && (
                      <span className={`text-xs font-semibold ${win.color}`}>{win.label}</span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5 capitalize">
                    {exercise.muscle} · {exercise.equipment}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-white">
                    {targetSets}×{targetReps}
                    {targetWeight > 0 ? ` · ${targetWeight}kg` : ""}
                  </p>
                  {isFirstSession && (
                    <p className="text-xs text-white/40">First session</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fallback suggestion */}
      {recommendation.fallback && (
        <div className="pt-1 border-t border-white/10">
          <p className="text-xs text-white/40">
            Alternative: <span className="text-white/60">{WORKOUT_TYPES[recommendation.fallback.workoutTypeId].name}</span>
          </p>
        </div>
      )}
    </div>
  );
}
