"use client";

import { SessionExercise } from "@/lib/workoutSessions";

interface Props {
  exercise: SessionExercise;
  exerciseIndex: number;
  onSetUpdate: (exIdx: number, setIdx: number, field: "reps" | "weight", value: number | null) => void;
  onSetToggle: (exIdx: number, setIdx: number) => void;
  onAddSet: (exIdx: number) => void;
}

export default function WorkoutExerciseRow({
  exercise,
  exerciseIndex,
  onSetUpdate,
  onSetToggle,
  onAddSet,
}: Props) {
  // Progressive overload: all sets done AND each done set >= last session weight and reps
  const hasPR: boolean = (() => {
    if (!exercise.lastSession || exercise.sets.length === 0) return false;
    const doneSets = exercise.sets.filter((s) => s.done);
    if (doneSets.length === 0) return false;
    // All sets must be done
    if (doneSets.length !== exercise.sets.length) return false;
    return exercise.sets.every((s, si) => {
      const last = exercise.lastSession!.sets[si];
      if (!last) return true; // no reference, treat as improvement
      const weightOk = s.weight !== null && last.weight !== null && s.weight >= last.weight;
      const repsOk = s.reps !== null && last.reps !== null && s.reps >= last.reps;
      return weightOk && repsOk;
    });
  })();

  return (
    <div
      className="rounded-2xl mb-4 overflow-hidden"
      style={{
        background: "var(--color-surface)",
        boxShadow: "0 0 0 1px var(--color-border, #F5DEE2), 0 2px 8px rgba(180,80,100,0.07)",
      }}
    >
      {/* ── Exercise header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Numbered badge */}
        <span
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold text-white"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          {exerciseIndex + 1}
        </span>

        {/* Name */}
        <span className="flex-1 font-display font-semibold text-dark text-sm leading-tight">
          {exercise.name}
        </span>

        {/* Note chip */}
        {exercise.note && (
          <span
            className="text-xs font-body px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(196,138,151,0.12)",
              color: "#C48A97",
            }}
          >
            {exercise.note}
          </span>
        )}

        {/* PR chip */}
        {hasPR && (
          <span
            className="text-xs font-body font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.15)", color: "#16a34a" }}
          >
            ↑ PR
          </span>
        )}
      </div>

      {/* ── Column labels ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 text-xs font-body"
        style={{
          borderTop: "1px solid var(--color-border, #F5DEE2)",
          color: "rgba(0,0,0,0.35)",
        }}
      >
        <span className="w-5 text-center">#</span>
        <span className="flex-1 text-center">kg</span>
        <span className="w-4 text-center">×</span>
        <span className="flex-1 text-center">Reps</span>
        {/* Spacer for toggle button column */}
        <span className="w-8" />
      </div>

      {/* ── Set rows ──────────────────────────────────────────────────── */}
      <div className="px-3 pb-1">
        {exercise.sets.map((set, si) => {
          const lastSet = exercise.lastSession?.sets[si];
          const isDone = set.done;

          return (
            <div key={si}>
              {/* Active input row */}
              <div className="flex items-center gap-2 py-2">
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
                  placeholder={lastSet?.weight != null ? String(lastSet.weight) : "0"}
                  value={set.weight ?? ""}
                  onChange={(e) =>
                    onSetUpdate(
                      exerciseIndex,
                      si,
                      "weight",
                      e.target.value === "" ? null : parseFloat(e.target.value)
                    )
                  }
                  className="flex-1 text-center text-sm font-body rounded-xl py-1.5 outline-none border"
                  style={{
                    background: isDone ? "rgba(34,197,94,0.06)" : "var(--color-bg, #F5E8EB)",
                    borderColor: isDone ? "rgba(34,197,94,0.3)" : "var(--color-border, #F5DEE2)",
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
                  placeholder={lastSet?.reps != null ? String(lastSet.reps) : "0"}
                  value={set.reps ?? ""}
                  onChange={(e) =>
                    onSetUpdate(
                      exerciseIndex,
                      si,
                      "reps",
                      e.target.value === "" ? null : parseInt(e.target.value, 10)
                    )
                  }
                  className="flex-1 text-center text-sm font-body rounded-xl py-1.5 outline-none border"
                  style={{
                    background: isDone ? "rgba(34,197,94,0.06)" : "var(--color-bg, #F5E8EB)",
                    borderColor: isDone ? "rgba(34,197,94,0.3)" : "var(--color-border, #F5DEE2)",
                    color: "var(--color-text)",
                    opacity: isDone ? 0.6 : 1,
                  }}
                />

                {/* Done toggle */}
                <button
                  type="button"
                  onClick={() => onSetToggle(exerciseIndex, si)}
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

              {/* Ghost row: last-session reference */}
              {lastSet && (
                <button
                  type="button"
                  onClick={() => {
                    onSetUpdate(exerciseIndex, si, "weight", lastSet.weight);
                    onSetUpdate(exerciseIndex, si, "reps", lastSet.reps);
                  }}
                  className="w-full flex items-center gap-2 px-1 pb-1.5 text-xs font-body rounded-lg transition-opacity hover:opacity-80 active:opacity-60"
                  style={{ color: "rgba(0,0,0,0.25)" }}
                >
                  <span className="w-5" />
                  <span className="flex-1 text-center">
                    {lastSet.weight != null ? lastSet.weight : "—"}
                  </span>
                  <span className="w-4 text-center">×</span>
                  <span className="flex-1 text-center">
                    {lastSet.reps != null ? lastSet.reps : "—"}
                  </span>
                  <span className="w-8 text-center text-[10px]">last</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Add set button ────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => onAddSet(exerciseIndex)}
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
  );
}
