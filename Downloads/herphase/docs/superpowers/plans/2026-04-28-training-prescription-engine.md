# Training Prescription Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure TypeScript phase prescription engine that adapts rep ranges, intensity, sets, rest time, and RPE/RIR to the user's current cycle phase and readiness — displayed as a read-only strip on each workout builder exercise row.

**Architecture:** `lib/trainingPrescription.ts` contains all logic as pure functions. It consumes the existing `DailySignals` type from `lib/sharedSignals.ts` and `CycleParams` from `lib/cycle.ts` — no new context or DB calls. The strip renders inline in `app/training/page.tsx` by calling `getPhaseAdjustedPrescription()` when an exercise name is present.

**Tech Stack:** TypeScript, Vitest, React (Next.js), existing `DailySignals` + `CycleParams` + `getPhaseBoundaries()` from the codebase.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/trainingPrescription.ts` | **Create** | All prescription logic — types, matrix, helpers, main function |
| `lib/trainingPrescription.test.ts` | **Create** | Unit tests for all logic layers |
| `app/training/page.tsx` | **Modify** | Add prescription strip to exercise rows |

---

## Task 1: Types and phase matrix

**Files:**
- Create: `lib/trainingPrescription.ts`
- Create: `lib/trainingPrescription.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/trainingPrescription.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PHASE_MATRIX } from "./trainingPrescription";

describe("PHASE_MATRIX", () => {
  const SUB_PHASES = ["menstrual", "follicular", "ovulation", "early_luteal", "late_luteal"] as const;

  it("defines all 5 sub-phases", () => {
    for (const sp of SUB_PHASES) {
      expect(PHASE_MATRIX[sp], `missing sub-phase: ${sp}`).toBeDefined();
    }
  });

  it("every sub-phase has required range fields", () => {
    for (const sp of SUB_PHASES) {
      const row = PHASE_MATRIX[sp];
      expect(row.intensityPercent).toHaveLength(2);
      expect(row.repRange).toHaveLength(2);
      expect(row.sets).toHaveLength(2);
      expect(row.rpe).toHaveLength(2);
      expect(row.rir).toHaveLength(2);
      expect(row.restSeconds).toHaveLength(2);
    }
  });

  it("all ranges have min <= max", () => {
    for (const sp of SUB_PHASES) {
      const row = PHASE_MATRIX[sp];
      expect(row.intensityPercent[0]).toBeLessThanOrEqual(row.intensityPercent[1]);
      expect(row.repRange[0]).toBeLessThanOrEqual(row.repRange[1]);
      expect(row.sets[0]).toBeLessThanOrEqual(row.sets[1]);
      expect(row.rpe[0]).toBeLessThanOrEqual(row.rpe[1]);
      expect(row.restSeconds[0]).toBeLessThanOrEqual(row.restSeconds[1]);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: FAIL — `PHASE_MATRIX` not found.

- [ ] **Step 3: Create `lib/trainingPrescription.ts` with types and matrix**

```ts
// lib/trainingPrescription.ts
// All imports upfront — used across tasks 1–6
import { getPhaseBoundaries, type CycleParams } from "@/lib/cycle";
import type { DailySignals } from "@/lib/sharedSignals";
import type { ReadinessLabel } from "@/lib/dailyPlan";

// ── Public types ──────────────────────────────────────────────────────────────

export interface BasePrescription {
  sets: number;
  reps: number;
  loadType: "weight_reps" | "reps_only" | "duration_only";
  targetRPE?: number;
  restSeconds?: number;
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

// ── Phase matrix (private) ────────────────────────────────────────────────────

type SubPhase = "menstrual" | "follicular" | "ovulation" | "early_luteal" | "late_luteal";

interface PhaseRow {
  intensityPercent: [number, number];
  repRange:         [number, number];
  sets:             [number, number];
  rpe:              [number, number];
  rir:              [number, number];
  restSeconds:      [number, number];
}

export const PHASE_MATRIX: Record<SubPhase, PhaseRow> = {
  menstrual:    { intensityPercent: [50, 65], repRange: [10, 15], sets: [2, 3], rpe: [5, 7], rir: [3, 5], restSeconds: [60,  90]  },
  follicular:   { intensityPercent: [70, 85], repRange: [6,  10], sets: [3, 5], rpe: [7, 9], rir: [1, 3], restSeconds: [90,  150] },
  ovulation:    { intensityPercent: [75, 90], repRange: [4,  8],  sets: [3, 5], rpe: [8, 9], rir: [1, 2], restSeconds: [120, 180] }, // rir floor 1: RPE 9 + RIR 1 = 10
  early_luteal: { intensityPercent: [65, 80], repRange: [8,  12], sets: [3, 4], rpe: [7, 8], rir: [2, 3], restSeconds: [90,  120] },
  late_luteal:  { intensityPercent: [55, 70], repRange: [10, 15], sets: [2, 4], rpe: [6, 7], rir: [3, 4], restSeconds: [60,  90]  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
cd Downloads/herphase && git add lib/trainingPrescription.ts lib/trainingPrescription.test.ts
git commit -m "feat: add trainingPrescription types and phase matrix"
```

---

## Task 2: Sub-phase detection

**Files:**
- Modify: `lib/trainingPrescription.ts`
- Modify: `lib/trainingPrescription.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/trainingPrescription.test.ts`:

```ts
import { getLutealSubPhase } from "./trainingPrescription";

describe("getLutealSubPhase", () => {
  // Default 28-day cycle: luteal runs day 17–28 (12 days)
  // First half: days 17–22, second half: days 23–28

  it("returns early_luteal for first half of luteal window", () => {
    expect(getLutealSubPhase(17, {})).toBe("early_luteal");
    expect(getLutealSubPhase(19, {})).toBe("early_luteal");
    expect(getLutealSubPhase(22, {})).toBe("early_luteal");
  });

  it("returns late_luteal for second half of luteal window", () => {
    expect(getLutealSubPhase(23, {})).toBe("late_luteal");
    expect(getLutealSubPhase(26, {})).toBe("late_luteal");
    expect(getLutealSubPhase(28, {})).toBe("late_luteal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: FAIL — `getLutealSubPhase` not found.

- [ ] **Step 3: Implement `getLutealSubPhase`**

Add to `lib/trainingPrescription.ts` after the `PHASE_MATRIX` constant (imports were already written in Task 1):

```ts
/** Splits the luteal phase into early (first half) and late (second half). */
export function getLutealSubPhase(cycleDay: number, cycleParams: CycleParams): "early_luteal" | "late_luteal" {
  const b = getPhaseBoundaries(cycleParams);
  const lutealMid = Math.floor((b.luteal.start + b.luteal.end) / 2);
  return cycleDay <= lutealMid ? "early_luteal" : "late_luteal";
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — all tests including new ones.

- [ ] **Step 5: Commit**

```bash
cd Downloads/herphase && git add lib/trainingPrescription.ts lib/trainingPrescription.test.ts
git commit -m "feat: add luteal sub-phase detection"
```

---

## Task 3: Readiness tier helper

**Files:**
- Modify: `lib/trainingPrescription.ts`
- Modify: `lib/trainingPrescription.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/trainingPrescription.test.ts`:

```ts
import { getReadinessTier } from "./trainingPrescription";

describe("getReadinessTier", () => {
  it("returns 'high' for readinessLabel peak or good", () => {
    expect(getReadinessTier("peak")).toBe("high");
    expect(getReadinessTier("good")).toBe("high");
  });

  it("returns 'moderate' for readinessLabel moderate", () => {
    expect(getReadinessTier("moderate")).toBe("moderate");
  });

  it("returns 'low' for readinessLabel rest", () => {
    expect(getReadinessTier("rest")).toBe("low");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: FAIL — `getReadinessTier` not found.

- [ ] **Step 3: Implement `getReadinessTier`**

Add to `lib/trainingPrescription.ts` after `getLutealSubPhase` (import is already at the top from Task 1):

```ts
type ReadinessTier = "high" | "moderate" | "low";

export function getReadinessTier(label: ReadinessLabel): ReadinessTier {
  if (label === "peak" || label === "good") return "high";
  if (label === "moderate") return "moderate";
  return "low"; // "rest"
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
cd Downloads/herphase && git add lib/trainingPrescription.ts lib/trainingPrescription.test.ts
git commit -m "feat: add readiness tier helper"
```

---

## Task 4: Core prescription function — layers 1 and 2

**Files:**
- Modify: `lib/trainingPrescription.ts`
- Modify: `lib/trainingPrescription.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/trainingPrescription.test.ts`:

```ts
import { getPhaseAdjustedPrescription } from "./trainingPrescription";
import type { DailySignals } from "@/lib/sharedSignals";

function makeSignals(overrides: Partial<DailySignals> = {}): DailySignals {
  return {
    phase: "luteal",
    cycleDay: 25,
    readinessScore: 60,
    readinessLabel: "moderate",
    biasTone: "neutral",
    symptomFlags: [],
    energy: null,
    mood: null,
    primaryGoal: null,
    ...overrides,
  };
}

const BASE = { sets: 3, reps: 8, loadType: "weight_reps" as const, targetRPE: 7, restSeconds: 120 };

describe("getPhaseAdjustedPrescription — layer 1 + 2", () => {
  it("ovulation / high readiness → peak intensity upper range", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "ovulation", cycleDay: 14, readinessLabel: "peak" }),
      cycleParams: {},
    });
    expect(result.intensityPercent[0]).toBeGreaterThanOrEqual(75);
    expect(result.intensityPercent[1]).toBeLessThanOrEqual(90);
    expect(result.adjustedRepRange[1]).toBeLessThanOrEqual(8);
    expect(result.shouldSwapExercise).toBe(false);
  });

  it("late luteal / high readiness stays within late_luteal envelope", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "luteal", cycleDay: 26, readinessLabel: "peak" }),
      cycleParams: {},
    });
    // Must not exceed late_luteal ceiling (70%) even with high readiness
    expect(result.intensityPercent[1]).toBeLessThanOrEqual(70);
    expect(result.adjustedRepRange[0]).toBeGreaterThanOrEqual(10);
  });

  it("menstrual / low readiness → reduced sets (min 2)", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "menstrual", cycleDay: 2, readinessLabel: "rest" }),
      cycleParams: {},
    });
    expect(result.adjustedSets).toBe(2);
  });

  it("follicular / moderate readiness → midpoint of follicular range", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "follicular", cycleDay: 8, readinessLabel: "moderate" }),
      cycleParams: {},
    });
    expect(result.intensityPercent[0]).toBeGreaterThanOrEqual(70);
    expect(result.intensityPercent[1]).toBeLessThanOrEqual(85);
  });

  it("returns no swap for normal conditions", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals(),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
    expect(result.suggestedAlternativeType).toBeUndefined();
  });

  it("duration_only loadType returns identity result with no rep/intensity values", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: { sets: 1, reps: 0, loadType: "duration_only" },
      signals: makeSignals(),
      cycleParams: {},
    });
    // Duration exercises don't have rep/intensity prescription
    expect(result.adjustedRepRange).toEqual([0, 0]);
    expect(result.intensityPercent).toEqual([0, 0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: FAIL — `getPhaseAdjustedPrescription` not found.

- [ ] **Step 3: Implement `getPhaseAdjustedPrescription` (layers 1 + 2)**

Add to `lib/trainingPrescription.ts`:

```ts
export function getPhaseAdjustedPrescription({
  basePrescription,
  signals,
  cycleParams = {},
}: {
  basePrescription: BasePrescription;
  signals: DailySignals;
  cycleParams?: CycleParams;
}): PrescriptionResult {
  // Duration-only exercises: no rep/intensity prescription
  if (basePrescription.loadType === "duration_only") {
    return {
      adjustedSets: basePrescription.sets,
      adjustedRepRange: [0, 0],
      intensityPercent: [0, 0],
      targetRPE: [0, 0],
      targetRIR: [0, 0],
      restSeconds: [0, 0],
      adjustmentReason: "",
      shouldSwapExercise: false,
    };
  }

  // ── Layer 1: resolve sub-phase ─────────────────────────────────────────────
  const subPhase: SubPhase =
    signals.phase === "luteal"
      ? getLutealSubPhase(signals.cycleDay ?? 20, cycleParams)
      : signals.phase;

  const row = PHASE_MATRIX[subPhase];

  // ── Layer 2: readiness modifier (within phase envelope only) ───────────────
  const tier = getReadinessTier(signals.readinessLabel);

  function pick(range: [number, number]): [number, number] {
    if (tier === "high")     return range;
    if (tier === "moderate") {
      const mid = Math.round((range[0] + range[1]) / 2);
      return [range[0], mid];
    }
    // low
    return [range[0], range[0]];
  }

  const baseSets = tier === "low"
    ? Math.max(2, row.sets[0] - 1)
    : row.sets[0];

  return {
    adjustedSets:    baseSets,
    adjustedRepRange: pick(row.repRange),
    intensityPercent: pick(row.intensityPercent),
    targetRPE:        pick(row.rpe),
    targetRIR:        pick(row.rir),
    restSeconds:      pick(row.restSeconds),
    adjustmentReason: buildAdjustmentReason(subPhase, tier, false),
    shouldSwapExercise: false,
  };
}
```

Add the stub for `buildAdjustmentReason` so the file compiles (full implementation in Task 6):

```ts
function buildAdjustmentReason(
  subPhase: SubPhase,
  tier: ReadinessTier,
  swapTriggered: boolean,
): string {
  return `${subPhase} / ${tier}`;  // placeholder — replaced in Task 6
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
cd Downloads/herphase && git add lib/trainingPrescription.ts lib/trainingPrescription.test.ts
git commit -m "feat: implement prescription layers 1 and 2"
```

---

## Task 5: Layer 3 — symptom override

**Files:**
- Modify: `lib/trainingPrescription.ts`
- Modify: `lib/trainingPrescription.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/trainingPrescription.test.ts`:

```ts
describe("getPhaseAdjustedPrescription — layer 3 symptom override", () => {
  const SEVERE_SYMPTOMS = ["cramps", "heavy bleeding"];

  it("triggers swap when readinessScore < 35 AND severe symptoms present", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        phase: "menstrual",
        cycleDay: 2,
        readinessScore: 20,
        readinessLabel: "rest",
        symptomFlags: SEVERE_SYMPTOMS,
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(true);
    expect(result.suggestedAlternativeType).toBe("mobility");
  });

  it("triggers swap with bodyweight alternative for non-menstrual phases", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        phase: "luteal",
        cycleDay: 26,
        readinessScore: 20,
        readinessLabel: "rest",
        symptomFlags: ["fatigue", "pain"],
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(true);
    expect(result.suggestedAlternativeType).toBe("bodyweight");
  });

  it("does NOT trigger swap if readinessScore >= 35 even with symptoms", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        readinessScore: 40,
        readinessLabel: "rest",
        symptomFlags: SEVERE_SYMPTOMS,
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
  });

  it("does NOT trigger swap if score < 35 but no severe symptoms", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        readinessScore: 20,
        readinessLabel: "rest",
        symptomFlags: ["bloating"],
      }),
      cycleParams: {},
    });
    expect(result.shouldSwapExercise).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: FAIL — swap never triggers.

- [ ] **Step 3: Add symptom override to `getPhaseAdjustedPrescription`**

Replace the return statement in the main function body with:

```ts
  // ── Layer 3: symptom override ──────────────────────────────────────────────
  const SEVERE = ["cramps", "fatigue", "pain", "heavy bleeding"];
  const hasSevereSymptom = (signals.symptomFlags ?? []).some(s => SEVERE.includes(s));
  const shouldSwap = hasSevereSymptom && signals.readinessScore < 35;

  return {
    adjustedSets:     baseSets,
    adjustedRepRange: pick(row.repRange),
    intensityPercent: pick(row.intensityPercent),
    targetRPE:        pick(row.rpe),
    targetRIR:        pick(row.rir),
    restSeconds:      pick(row.restSeconds),
    adjustmentReason: buildAdjustmentReason(subPhase, tier, shouldSwap),
    shouldSwapExercise: shouldSwap,
    suggestedAlternativeType: shouldSwap
      ? (signals.phase === "menstrual" ? "mobility" : "bodyweight")
      : undefined,
  };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
cd Downloads/herphase && git add lib/trainingPrescription.ts lib/trainingPrescription.test.ts
git commit -m "feat: add symptom override (layer 3) to prescription engine"
```

---

## Task 6: Adjustment reason copy

**Files:**
- Modify: `lib/trainingPrescription.ts`
- Modify: `lib/trainingPrescription.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/trainingPrescription.test.ts`:

```ts
describe("getPhaseAdjustedPrescription — adjustment reason", () => {
  it("ovulation / high → mentions peak or intensity", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "ovulation", cycleDay: 14, readinessLabel: "peak" }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/peak|intensity/);
  });

  it("late luteal / moderate → mentions rep range or recovery", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "luteal", cycleDay: 26, readinessLabel: "moderate" }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/rep|recovery|luteal/);
  });

  it("menstrual / any → mentions body or volume", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({ phase: "menstrual", cycleDay: 2, readinessLabel: "rest" }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/body|volume|light/);
  });

  it("swap triggered → mentions alternative or intense", () => {
    const result = getPhaseAdjustedPrescription({
      basePrescription: BASE,
      signals: makeSignals({
        phase: "menstrual", cycleDay: 2,
        readinessScore: 20, readinessLabel: "rest",
        symptomFlags: ["cramps"],
      }),
      cycleParams: {},
    });
    expect(result.adjustmentReason.toLowerCase()).toMatch(/intense|alternative|lighter/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: FAIL — reasons are placeholder strings.

- [ ] **Step 3: Replace `buildAdjustmentReason` stub with real implementation**

Replace the stub `buildAdjustmentReason` function in `lib/trainingPrescription.ts` with:

```ts
const REASONS: Record<SubPhase, Record<ReadinessTier, string>> = {
  menstrual: {
    high:     "Your body is doing important work. We kept volume light and rest generous.",
    moderate: "Light volume today — your body is in its rest window.",
    low:      "We reduced volume to match how you're feeling. Movement is still medicine.",
  },
  follicular: {
    high:     "Rising oestrogen supports strength gains — intensity is up and rep range is lower.",
    moderate: "Good window for progressive work. We've set a solid moderate range.",
    low:      "Energy is lower than usual. We scaled back slightly — your movement stays the same.",
  },
  ovulation: {
    high:     "Ovulation is your peak window — intensity is up and rest is longer to match.",
    moderate: "You're in a strong performance window. We set a solid working range.",
    low:      "Peak phase, but energy is lower today. We kept intensity moderate.",
  },
  early_luteal: {
    high:     "Early luteal supports solid training. We set a strong moderate range.",
    moderate: "We moved you into a balanced rep range to match your early luteal phase.",
    low:      "Energy is dipping. We reduced volume slightly — your workout stays the same.",
  },
  late_luteal: {
    high:     "Late luteal recovery pattern — we moved rep range up and kept intensity controlled.",
    moderate: "We moved you into a 10–12 rep range to match your luteal recovery pattern.",
    low:      "Energy is low today. We reduced volume slightly — your movement stays the same.",
  },
};

function buildAdjustmentReason(
  subPhase: SubPhase,
  tier: ReadinessTier,
  swapTriggered: boolean,
): string {
  if (swapTriggered) {
    return "This might feel intense today. Consider a lighter alternative.";
  }
  return REASONS[subPhase][tier];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
cd Downloads/herphase && git add lib/trainingPrescription.ts lib/trainingPrescription.test.ts
git commit -m "feat: add premium adjustment reason copy to prescription engine"
```

---

## Task 7: UI — prescription strip in workout builder

**Files:**
- Modify: `app/training/page.tsx`

- [ ] **Step 1: Add the `buildPrescriptionSignals` helper at the top of the component file**

In `app/training/page.tsx`, add this import alongside the existing ones:

```ts
import {
  getPhaseAdjustedPrescription,
  type BasePrescription,
  type PrescriptionResult,
} from "@/lib/trainingPrescription";
import { getPhaseData } from "@/lib/cycle";
```

Add this helper function just before the `TrainingPage` component definition:

```ts
function buildPrescriptionSignals(
  phaseData: ReturnType<typeof getPhaseData>,
  cycleDay: number,
  cycleParams: import("@/lib/cycle").CycleParams,
  dailySignals: import("@/lib/sharedSignals").DailySignals | null,
): import("@/lib/sharedSignals").DailySignals {
  if (dailySignals) return dailySignals;
  // Fallback: build minimal signals from phase data when no check-in exists
  const labelMap: Record<string, import("@/lib/dailyPlan").ReadinessLabel> = {
    low: "rest", moderate: "moderate", high: "good", peak: "peak",
  };
  return {
    phase: phaseData.phase,
    cycleDay,
    readinessScore: phaseData.readinessScore,
    readinessLabel: labelMap[phaseData.energyLevel] ?? "moderate",
    biasTone: "neutral",
    symptomFlags: [],
    energy: null,
    mood: null,
    primaryGoal: null,
  };
}

const DEFAULT_BASE: Record<string, BasePrescription> = {
  weight_reps: { sets: 3, reps: 8,  loadType: "weight_reps", targetRPE: 7, restSeconds: 120 },
  reps_only:   { sets: 3, reps: 10, loadType: "reps_only",   restSeconds: 60 },
};
```

- [ ] **Step 2: Add dismissed-swap state to the component**

Inside `TrainingPage`, alongside the existing `useState` declarations, add:

```ts
const [dismissedSwaps, setDismissedSwaps] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Add the prescription strip inside each exercise row**

Locate this block in `app/training/page.tsx` (inside the exercise `.map()`):

```tsx
<input type="text" placeholder="Exercise name…" value={exercise.name}
```

Immediately **after** the `</div>` that closes the exercise header row (the one containing the name input and remove button), add the prescription strip:

```tsx
{/* ── HerPhase prescription strip ── */}
{(exercise.exType === "weight_reps" || exercise.exType === "reps_only") && exercise.name.trim() && (() => {
  const sig = buildPrescriptionSignals(phaseData, cycleDay, cycleParams, dailySignals);
  const base = DEFAULT_BASE[exercise.exType] ?? DEFAULT_BASE.weight_reps;
  const rx: PrescriptionResult = getPhaseAdjustedPrescription({ basePrescription: base, signals: sig, cycleParams });

  if (rx.shouldSwapExercise && !dismissedSwaps.has(exercise.id)) {
    return (
      <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2"
        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
        <p className="text-xs font-body leading-snug flex-1" style={{ color: "var(--color-text-mid)" }}>
          {rx.adjustmentReason}
        </p>
        <button
          onClick={() => setDismissedSwaps(p => new Set(p).add(exercise.id))}
          className="text-dark/30 hover:text-dark text-base leading-none flex-shrink-0">
          ×
        </button>
      </div>
    );
  }

  if (rx.shouldSwapExercise) return null;

  const [repLo, repHi]   = rx.adjustedRepRange;
  const [rpeLo, rpeHi]   = rx.targetRPE;
  const [restLo, restHi] = rx.restSeconds;
  const restLabel = restLo === restHi ? `${restLo}s` : `${restLo}–${restHi}s`;

  return (
    <div className="mx-4 mb-2 rounded-xl px-3 py-2.5"
      style={{ background: "rgba(196,138,151,0.06)", border: "1px solid rgba(196,138,151,0.15)" }}>
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <span className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#C48A97" }}>
          HerPhase
        </span>
        <span className="text-dark/20 text-xs">·</span>
        <span className="text-xs font-semibold text-dark">{rx.adjustedSets} sets</span>
        <span className="text-dark/20 text-xs">·</span>
        <span className="text-xs font-semibold text-dark">{repLo}–{repHi} reps</span>
        <span className="text-dark/20 text-xs">·</span>
        <span className="text-xs font-semibold text-dark">RPE {rpeLo}–{rpeHi}</span>
        <span className="text-dark/20 text-xs">·</span>
        <span className="text-xs font-semibold text-dark">Rest {restLabel}</span>
      </div>
      <p className="text-xs font-body leading-snug" style={{ color: "var(--color-text-mid)" }}>
        {rx.adjustmentReason}
      </p>
    </div>
  );
})()}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd Downloads/herphase && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
cd Downloads/herphase && npx vitest run lib/trainingPrescription.test.ts
```

Expected: PASS — all tests.

- [ ] **Step 6: Open the app in the browser and verify the strip appears**

Navigate to `http://localhost:3001/training` (or whichever port the dev server is running on).

Add an exercise (e.g. "Hip Thrust"). Verify:
- The HerPhase strip appears below the exercise name
- It shows sets · rep range · RPE · rest time
- The reason copy is visible and reads naturally
- The strip does NOT appear for cardio/duration exercises
- Adding a second exercise also shows the strip

- [ ] **Step 7: Commit**

```bash
cd Downloads/herphase && git add app/training/page.tsx
git commit -m "feat: add phase prescription strip to workout builder exercise rows"
```

---

## Final verification

- [ ] Run the full test suite:

```bash
cd Downloads/herphase && npx vitest run
```

Expected: all `lib/trainingPrescription.test.ts` tests pass, no regressions in other test files.
