# Training Prescription Engine — Design Spec
_Date: 2026-04-28_

## Summary

Build a pure TypeScript phase prescription engine (`lib/trainingPrescription.ts`) that adapts rep ranges, intensity, sets, rest time, and RPE/RIR to the user's current cycle phase and daily readiness — without changing exercise selection. Wire it into the existing workout builder as a read-only informational strip on each exercise row.

**Core principle:** The workout stays the same. HerPhase adjusts the loading variables.

---

## Scope

### In scope
- `lib/trainingPrescription.ts` — new file, pure TypeScript
- Prescription strip UI in `app/training/page.tsx` exercise rows
- Early/late luteal sub-phase detection using existing `getPhaseBoundaries()`

### Out of scope
- Exercise database changes or Supabase migration
- Exercise selection logic changes (except extreme low-readiness swap suggestion)
- Media (GIFs, images)
- External API integration

---

## New File: `lib/trainingPrescription.ts`

### Types

```ts
export interface BasePrescription {
  sets: number;
  reps: number;
  loadType: "weight_reps" | "reps_only" | "duration_only";
  targetRPE?: number;
  restSeconds?: number;
}

export interface PrescriptionSignals {
  phase: "menstrual" | "follicular" | "ovulation" | "luteal";
  cycleDay: number;
  cycleLength?: number;
  periodLength?: number;
  ovulationLength?: number;
  readinessScore: number;       // 0–100
  energyLevel: "low" | "moderate" | "high" | "peak";
  symptoms?: string[];
}

export interface PrescriptionResult {
  adjustedSets: number;
  adjustedRepRange: [number, number];
  intensityPercent: [number, number];
  targetRPE: [number, number];
  targetRIR: [number, number];
  restSeconds: [number, number];
  adjustmentReason: string;
  shouldSwapExercise: boolean;
  suggestedAlternativeType?: "bodyweight" | "mobility";
}
```

### Phase Matrix (private lookup)

| Sub-phase | Intensity % | Reps | Sets | RPE | RIR | Rest (s) |
|---|---|---|---|---|---|---|
| menstrual | 50–65 | 10–15 | 2–3 | 5–7 | 3–5 | 60–90 |
| follicular | 70–85 | 6–10 | 3–5 | 7–9 | 1–3 | 90–150 |
| ovulation | 75–90 | 4–8 | 3–5 | 8–9 | 0–2 | 120–180 |
| early_luteal | 65–80 | 8–12 | 3–4 | 7–8 | 2–3 | 90–120 |
| late_luteal | 55–70 | 10–15 | 2–4 | 6–7 | 3–4 | 60–90 |

### Sub-phase Detection

Use `getPhaseBoundaries(params)` from `lib/cycle.ts` to get the luteal window boundaries. If the user is in the luteal phase:
- `cycleDay` in the first half of the luteal window → `early_luteal`
- `cycleDay` in the second half → `late_luteal`

### Three-Layer Logic

**Layer 1 — Phase baseline**
Look up the sub-phase row. This defines the full range for every variable.

**Layer 2 — Readiness modifier (within phase envelope only)**
Readiness and energy nudge values within the baseline range. They never exceed phase boundaries.

| Condition | Modifier |
|---|---|
| readiness ≥ 75 OR energy "high"/"peak" | Use upper end of range |
| readiness 45–74 OR energy "moderate" | Use midpoint of range |
| readiness < 45 OR energy "low" | Use lower end; reduce sets by 1 (min 2) |

**Layer 3 — Symptom override (extreme cases only)**
Triggers only when ALL conditions are true:
- `symptoms` includes "cramps", "fatigue", "pain", or "heavy bleeding"
- AND `readinessScore < 35`

Result: `shouldSwapExercise: true`, `suggestedAlternativeType: "bodyweight"` (or `"mobility"` if phase is menstrual).

### Adjustment Reason Copy

Short premium strings, one per phase + modifier tier. Examples:

- Ovulation / high readiness: *"Ovulation is your peak window — intensity is up and rest is longer to match."*
- Late luteal / moderate: *"We moved you into a 10–12 rep range to match your luteal recovery pattern."*
- Late luteal / low readiness: *"Energy is low today. We reduced volume slightly — your movement stays the same."*
- Follicular / high readiness: *"Rising oestrogen supports strength gains — we pushed your rep range down and intensity up."*
- Menstrual: *"Your body is doing important work. We kept volume light and rest generous."*
- Symptom override: *"This might feel intense today. Consider a lighter alternative."*

---

## UI Integration: `app/training/page.tsx`

### Prescription strip

Displayed inline in each exercise row, below the exercise name, above the set inputs. Only shown for `weight_reps` and `reps_only` input types.

**Layout (single block):**
```
HerPhase suggests  ·  3 sets  ·  10–12 reps  ·  RPE 6–7  ·  Rest 90s
"We moved you into a moderate rep range to match your luteal recovery."
```

### Data flow

- `getPhaseAdjustedPrescription()` called when exercise name is non-empty
- `basePrescription` derived from a small per-`InputType` default table:
  - `weight_reps`: 3 sets, 8 reps, RPE 7, 120s rest
  - `reps_only`: 3 sets, 10 reps, 60s rest
- `dailySignals` sourced from `useApp()`: `cycleDay`, `cycleParams`, and readiness/energy from `todayState` if present — otherwise fall back to `getPhaseData(cycleDay, cycleParams).readinessScore` and `.energyLevel` (always available, no check-in required)
- Strip is **read-only** — never pre-fills set/rep inputs
- `shouldSwapExercise: true` → renders a soft warning with a dismiss button instead of the strip

### No new components required

The strip is an inline block within the existing exercise row in `training/page.tsx`.

---

## Integration Points (existing code unchanged)

| File | Role | Change |
|---|---|---|
| `lib/cycle.ts` | `getPhaseBoundaries()` | Read only — no changes |
| `lib/exercises.ts` | `InputType`, exercise names | Read only — no changes |
| `context/AppContext.tsx` | `cycleDay`, `cycleParams`, `todayState` | Read only — no changes |
| `app/training/page.tsx` | Exercise row UI | Add prescription strip block |

---

## What This Delivers

The user opens the workout builder, adds "Hip Thrust", and sees:

> **HerPhase suggests** · 3 sets · 10–12 reps · RPE 6–7 · Rest 90s
> *"We moved you into a moderate rep range to match your luteal recovery pattern."*

Her workout doesn't change. Her loading strategy does. That's the HerPhase difference.
