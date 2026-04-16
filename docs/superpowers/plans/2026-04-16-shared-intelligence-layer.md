# Shared Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a typed `DailySignals` contract through AppContext so Training, Meals, and Insights all read from the same daily state instead of re-deriving it independently.

**Architecture:** One new pure file (`lib/sharedSignals.ts`) derives `DailySignals` from the existing `TodayState`. `AppContext` computes `dailySignals` alongside `todayState` via `useMemo`. Three UI wires adopt it incrementally — no domain engine rewrites, no DB changes.

**Tech Stack:** TypeScript, React 18 `useMemo`, Next.js 14 App Router, Vitest

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `lib/sharedSignals.ts` | **Create** | `DailySignals` type, `BiasTone` type, `extractDailySignals()` pure function |
| `lib/sharedSignals.test.ts` | **Create** | Unit tests — biasTone derivation, signal passthrough, null guards |
| `context/AppContext.tsx` | **Modify** | Add `dailySignals` to interface, default, useMemo, provider value |
| `components/TrainingIntelligenceCard.tsx` | **Modify** | Consume `dailySignals` — symptoms/energy/goal now flow from shared state |
| `app/meals/page.tsx` | **Modify** | Add `mealFocus` banner above `MealRecommendationCards` |
| `app/insights/page.tsx` | **Modify** | Add insight section in overview tab (richer layout than Dashboard) |

---

## Task 1: Create `lib/sharedSignals.ts` with unit tests

**Files:**
- Create: `lib/sharedSignals.ts`
- Create: `lib/sharedSignals.test.ts`

---

- [ ] **Step 1: Write the failing tests**

Create `lib/sharedSignals.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractDailySignals } from "./sharedSignals";
import type { TodayState } from "./dailyPlan";

// Minimal TodayState — only fields extractDailySignals reads
function makeTodayState(overrides: Partial<TodayState> = {}): TodayState {
  return {
    readinessScore: 70,
    readinessLabel: "good",
    workoutRecommendation: {
      type: "Strength",
      intensity: "high",
      duration: 50,
      reasoning: "Phase supports heavy loading",
    },
    mealFocus: { headline: "Protein focus", reasoning: "Builds muscle. Eat more." },
    insightTitle: "Peak performance window",
    insightBody: "Your energy is high this phase.",
    dataMaturityStage: "generic",
    adaptedFromCheckin: false,
    ...overrides,
  };
}

const BASE_EXTRAS = {
  phase:        "follicular" as const,
  cycleDay:     8,
  symptomFlags: [] as string[],
  energy:       null,
  mood:         null,
  primaryGoal:  null,
};

describe("extractDailySignals — readiness passthrough", () => {
  it("reads readinessScore from TodayState", () => {
    const result = extractDailySignals(makeTodayState({ readinessScore: 85 }), BASE_EXTRAS);
    expect(result.readinessScore).toBe(85);
  });

  it("reads readinessLabel from TodayState", () => {
    const result = extractDailySignals(makeTodayState({ readinessLabel: "peak" }), BASE_EXTRAS);
    expect(result.readinessLabel).toBe("peak");
  });
});

describe("extractDailySignals — extras passthrough", () => {
  it("passes phase from extras", () => {
    const result = extractDailySignals(makeTodayState(), { ...BASE_EXTRAS, phase: "luteal" });
    expect(result.phase).toBe("luteal");
  });

  it("passes cycleDay from extras (including null)", () => {
    const result = extractDailySignals(makeTodayState(), { ...BASE_EXTRAS, cycleDay: null });
    expect(result.cycleDay).toBeNull();
  });

  it("passes symptomFlags from extras", () => {
    const result = extractDailySignals(makeTodayState(), { ...BASE_EXTRAS, symptomFlags: ["cramps", "fatigue"] });
    expect(result.symptomFlags).toEqual(["cramps", "fatigue"]);
  });

  it("passes energy from extras", () => {
    const result = extractDailySignals(makeTodayState(), { ...BASE_EXTRAS, energy: 3 });
    expect(result.energy).toBe(3);
  });

  it("passes mood from extras", () => {
    const result = extractDailySignals(makeTodayState(), { ...BASE_EXTRAS, mood: 4 });
    expect(result.mood).toBe(4);
  });

  it("passes primaryGoal from extras", () => {
    const result = extractDailySignals(makeTodayState(), { ...BASE_EXTRAS, primaryGoal: "fat_loss" });
    expect(result.primaryGoal).toBe("fat_loss");
  });
});

describe("extractDailySignals — biasTone derivation", () => {
  it("rest label → recover (any phase)", () => {
    const ts = makeTodayState({ readinessLabel: "rest" });
    for (const phase of ["menstrual", "follicular", "ovulation", "luteal"] as const) {
      const r = extractDailySignals(ts, { ...BASE_EXTRAS, phase });
      expect(r.biasTone, `phase=${phase}`).toBe("recover");
    }
  });

  it("peak + follicular → push", () => {
    const result = extractDailySignals(
      makeTodayState({ readinessLabel: "peak" }),
      { ...BASE_EXTRAS, phase: "follicular" },
    );
    expect(result.biasTone).toBe("push");
  });

  it("peak + ovulation → push", () => {
    const result = extractDailySignals(
      makeTodayState({ readinessLabel: "peak" }),
      { ...BASE_EXTRAS, phase: "ovulation" },
    );
    expect(result.biasTone).toBe("push");
  });

  it("peak + luteal → neutral (not a push phase)", () => {
    const result = extractDailySignals(
      makeTodayState({ readinessLabel: "peak" }),
      { ...BASE_EXTRAS, phase: "luteal" },
    );
    expect(result.biasTone).toBe("neutral");
  });

  it("peak + menstrual → neutral", () => {
    const result = extractDailySignals(
      makeTodayState({ readinessLabel: "peak" }),
      { ...BASE_EXTRAS, phase: "menstrual" },
    );
    expect(result.biasTone).toBe("neutral");
  });

  it("good label → neutral regardless of phase", () => {
    const ts = makeTodayState({ readinessLabel: "good" });
    for (const phase of ["follicular", "ovulation"] as const) {
      const r = extractDailySignals(ts, { ...BASE_EXTRAS, phase });
      expect(r.biasTone, `phase=${phase}`).toBe("neutral");
    }
  });

  it("moderate label → neutral", () => {
    const result = extractDailySignals(
      makeTodayState({ readinessLabel: "moderate" }),
      { ...BASE_EXTRAS, phase: "ovulation" },
    );
    expect(result.biasTone).toBe("neutral");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run lib/sharedSignals.test.ts
```

Expected: FAIL — "Cannot find module './sharedSignals'"

- [ ] **Step 3: Implement `lib/sharedSignals.ts`**

Create `lib/sharedSignals.ts`:

```typescript
// lib/sharedSignals.ts
// Derives a narrow typed DailySignals contract from TodayState.
// Pure function — no DB calls, no side effects.
// Consumed by AppContext and passed to domain engines (TrainingIntelligenceCard, etc.).

import type { Phase } from "@/types/recipe";
import type { TodayState, ReadinessLabel } from "@/lib/dailyPlan";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BiasTone = "push" | "recover" | "neutral";

export interface DailySignals {
  phase:          Phase;
  cycleDay:       number | null;
  readinessScore: number;
  readinessLabel: ReadinessLabel;
  biasTone:       BiasTone;
  symptomFlags:   string[];
  energy:         number | null;
  mood:           number | null;
  primaryGoal:    string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveBiasTone(label: ReadinessLabel, phase: Phase): BiasTone {
  if (label === "rest") return "recover";
  if (label === "peak" && (phase === "follicular" || phase === "ovulation")) return "push";
  return "neutral";
}

// ── Public API ────────────────────────────────────────────────────────────────

export function extractDailySignals(
  todayState: TodayState,
  extras: {
    phase:        Phase;
    cycleDay:     number | null;
    symptomFlags: string[];
    energy:       number | null;
    mood:         number | null;
    primaryGoal:  string | null;
  },
): DailySignals {
  return {
    phase:          extras.phase,
    cycleDay:       extras.cycleDay,
    readinessScore: todayState.readinessScore,
    readinessLabel: todayState.readinessLabel,
    biasTone:       deriveBiasTone(todayState.readinessLabel, extras.phase),
    symptomFlags:   extras.symptomFlags,
    energy:         extras.energy,
    mood:           extras.mood,
    primaryGoal:    extras.primaryGoal,
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run lib/sharedSignals.test.ts
```

Expected: PASS — all 13 tests green

- [ ] **Step 5: Commit**

```bash
git add lib/sharedSignals.ts lib/sharedSignals.test.ts
git commit -m "feat: add sharedSignals pure module with DailySignals contract"
```

---

## Task 2: Wire `dailySignals` into `AppContext`

**Files:**
- Modify: `context/AppContext.tsx`

---

- [ ] **Step 1: Add the import**

At the top of `context/AppContext.tsx`, after the existing imports, add:

```typescript
import { extractDailySignals, type DailySignals } from "@/lib/sharedSignals";
```

The full import block at the top of the file becomes:

```typescript
import {
  createContext, useContext, useEffect, useState,
  useCallback, useMemo, ReactNode,
} from "react";
import { supabase, type Profile, type MoodLog } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { calcCycleDayFromDate, getPhase, type CycleParams } from "@/lib/cycle";
import {
  generateTodayState,
  type TodayState,
  type CheckInSnapshot,
} from "@/lib/dailyPlan";
import { extractDailySignals, type DailySignals } from "@/lib/sharedSignals";
```

- [ ] **Step 2: Add `dailySignals` to `AppContextValue` interface**

Find the `AppContextValue` interface (around line 25). Add `dailySignals` after `todayState`:

```typescript
interface AppContextValue {
  // ── Existing (unchanged) ──────────────────────────────────────────────────
  user: User | null;
  profile: Profile | null;
  cycleDay: number;
  cycleParams: CycleParams;
  loading: boolean;
  newCyclePrompt: boolean;
  dismissNewCyclePrompt: () => void;
  setCycleDay: (day: number) => void;
  setPeriodStartToday: () => Promise<void>;
  setPeriodStartDate: (date: string) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // ── New in Step 2 ─────────────────────────────────────────────────────────
  todayState: TodayState | null;
  latestMoodLog: MoodLog | null;
  logCount: number;
  refreshTodayState: () => Promise<void>;

  // ── Shared signals ────────────────────────────────────────────────────────
  dailySignals: DailySignals | null;
}
```

- [ ] **Step 3: Add `dailySignals: null` to the context default**

Find the `AppContext` default object (around line 50). Add `dailySignals: null` after `refreshTodayState`:

```typescript
const AppContext = createContext<AppContextValue>({
  user: null, profile: null, cycleDay: 8, cycleParams: {}, loading: true,
  newCyclePrompt: false, dismissNewCyclePrompt: () => {},
  setCycleDay: () => {}, setPeriodStartToday: async () => {},
  setPeriodStartDate: async () => {}, refreshProfile: async () => {},
  // New defaults
  todayState: null,
  latestMoodLog: null,
  logCount: 0,
  refreshTodayState: async () => {},
  dailySignals: null,
});
```

- [ ] **Step 4: Add `dailySignals` useMemo inside `AppProvider`**

Find the `todayState` useMemo (ends around line 133). Add the `dailySignals` useMemo immediately after it:

```typescript
  const dailySignals = useMemo<DailySignals | null>(() => {
    if (!todayState) return null;
    return extractDailySignals(todayState, {
      phase:        getPhase(cycleDay, cycleParams),
      cycleDay:     cycleDay ?? null,
      symptomFlags: latestMoodLog?.symptoms ?? [],
      energy:       latestMoodLog?.energy   ?? null,
      mood:         latestMoodLog?.mood     ?? null,
      primaryGoal:  profile?.body_goal ?? profile?.goals?.[0] ?? null,
    });
  }, [todayState, cycleDay, cycleParams, latestMoodLog, profile]);
```

- [ ] **Step 5: Expose `dailySignals` in the provider value**

Find the `return (` block at the bottom of `AppProvider` (around line 319). Add `dailySignals` to the value object:

```typescript
  return (
    <AppContext.Provider value={{
      // Existing
      user, profile, cycleDay, cycleParams, loading,
      newCyclePrompt, dismissNewCyclePrompt,
      setCycleDay: setCycleDayAndSave,
      setPeriodStartToday, setPeriodStartDate, refreshProfile,
      // New
      todayState,
      latestMoodLog,
      logCount,
      refreshTodayState,
      // Shared signals
      dailySignals,
    }}>
      {children}
    </AppContext.Provider>
  );
```

- [ ] **Step 6: Verify the project still compiles**

```
npx tsc --noEmit
```

Expected: no errors. If you see "Property 'dailySignals' does not exist", check that the interface and default were updated in Steps 2 and 3.

- [ ] **Step 7: Run full test suite to confirm nothing broke**

```
npx vitest run
```

Expected: all existing tests still pass, plus 13 new sharedSignals tests.

- [ ] **Step 8: Commit**

```bash
git add context/AppContext.tsx
git commit -m "feat: expose dailySignals from AppContext via extractDailySignals"
```

---

## Task 3: Training tab — consume `dailySignals`

**Files:**
- Modify: `components/TrainingIntelligenceCard.tsx`

---

- [ ] **Step 1: Update the `useApp` destructure**

Find these lines near the top of the component (around line 53):

```typescript
const { todayState, cycleDay, cycleParams, profile } = useApp();
```

Replace with:

```typescript
const { dailySignals, cycleDay, cycleParams } = useApp();
```

`profile` and `todayState` are no longer needed directly — their relevant fields come through `dailySignals`.

- [ ] **Step 2: Remove the manual signal derivations**

Find and delete these four lines (around lines 60–63):

```typescript
const phase          = getPhase(cycleDay ?? 1, cycleParams);
const readinessScore = todayState?.readinessScore ?? 60;
const readinessLabel = (todayState?.readinessLabel ?? "moderate") as ReadinessLabel;
const goal           = profile?.body_goal ?? profile?.goals?.[0] ?? null;
```

- [ ] **Step 3: Update `buildTrainingInput` call**

Find the `trainingInput` block (around lines 75–86):

```typescript
const trainingInput = buildTrainingInput({
  phase,
  cycleDay:           cycleDay ?? 1,
  readinessScore,
  readinessLabel,
  symptoms:           [],
  goal,
  energy:             null,
  equipmentLevel:     "gym",
  availableMinutes:   60,
  recentWorkoutTypes: recentTypes,
});
```

Replace with:

```typescript
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
```

- [ ] **Step 4: Remove unused imports**

Find the import line for `ReadinessLabel`:

```typescript
import type { ReadinessLabel } from "@/lib/progressionEngine";
```

Delete it — it is no longer used after removing the `as ReadinessLabel` cast.

- [ ] **Step 5: Verify no TypeScript errors**

```
npx tsc --noEmit
```

Expected: no errors. The `dailySignals?.readinessLabel` type (`ReadinessLabel` from `dailyPlan`) is structurally identical to the `readinessLabel` field on `TrainingEngineInput` — no cast needed.

- [ ] **Step 6: Commit**

```bash
git add components/TrainingIntelligenceCard.tsx
git commit -m "feat: TrainingIntelligenceCard consumes dailySignals — symptoms and energy now flow through"
```

---

## Task 4: Meals tab — add `mealFocus` banner

**Files:**
- Modify: `app/meals/page.tsx`

---

- [ ] **Step 1: Locate the insertion point**

In `app/meals/page.tsx`, find the closing `</div>` of the V1.1 nutrition section (around line 250) followed by the `MealRecommendationCards` comment:

```tsx
        </div>

        {/* ── V1.1: Phase-aware meal recommendation cards — below logged entries ── */}
        <MealRecommendationCards
```

The banner goes between these two blocks.

- [ ] **Step 2: Insert the banner**

Replace that gap with:

```tsx
        </div>

        {/* ── Phase meal focus banner — sourced from todayState.mealFocus ── */}
        {todayState?.mealFocus && (
          <div
            className="rounded-2xl px-4 py-3 mb-3"
            style={{ background: "rgba(196,138,151,0.07)", border: "1px solid rgba(196,138,151,0.12)" }}
          >
            <p className="text-sm font-semibold text-white/80 leading-snug">
              {todayState.mealFocus.headline}
            </p>
            <p className="text-xs text-white/50 mt-0.5 leading-snug">
              {todayState.mealFocus.reasoning.split(".")[0]}.
            </p>
          </div>
        )}

        {/* ── V1.1: Phase-aware meal recommendation cards — below logged entries ── */}
        <MealRecommendationCards
```

`todayState` is already destructured from `useApp()` at line 35 — no new import needed. The `.split(".")[0]` takes the first sentence only, keeping the banner tight.

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: no errors. `todayState?.mealFocus` is typed as `MealFocus | undefined` — the null guard handles both null todayState and undefined mealFocus.

- [ ] **Step 4: Commit**

```bash
git add app/meals/page.tsx
git commit -m "feat: surface mealFocus banner above meal recommendation cards"
```

---

## Task 5: Insights tab — add insight section

**Files:**
- Modify: `app/insights/page.tsx`

---

- [ ] **Step 1: Locate the insertion point**

In `app/insights/page.tsx`, find the start of the overview tab content (around line 263):

```tsx
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* Best/worst phase — only shown with 2+ phases and early/personalized */}
```

The insight section goes inside `<div className="space-y-4">`, as the first child, before the best/worst phase block.

- [ ] **Step 2: Insert the insight section**

Replace the opening of that block with:

```tsx
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* ── Today's insight — same source as Dashboard, richer layout ── */}
                {maturity !== "generic" && todayState?.insightTitle && (
                  <div
                    className="rounded-2xl p-5 shadow-card"
                    style={{ background: "rgba(196,138,151,0.07)", border: "1px solid rgba(196,138,151,0.12)" }}
                  >
                    <p className="text-xs font-semibold text-dark/40 uppercase tracking-widest mb-2">
                      Today's Insight
                    </p>
                    <p className="font-semibold text-dark text-base leading-snug mb-2">
                      {todayState.insightTitle}
                    </p>
                    <p className="text-sm text-dark/60 leading-relaxed font-body">
                      {todayState.insightBody}
                    </p>
                  </div>
                )}

                {/* Best/worst phase — only shown with 2+ phases and early/personalized */}
```

`todayState` is already destructured from `useApp()` at line 66. `maturity` is already computed at line 77. No new imports needed.

The `maturity !== "generic"` guard matches the existing pattern — generic-stage users see the "Building your phase profile" nudge instead (already at line 303).

- [ ] **Step 3: Verify TypeScript**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite one final time**

```
npx vitest run
```

Expected: all tests pass (existing 40 + 13 new = 53 total).

- [ ] **Step 5: Commit**

```bash
git add app/insights/page.tsx
git commit -m "feat: surface insightTitle/insightBody in Insights overview tab"
```

---

## Self-review checklist

- [x] `lib/sharedSignals.ts` — pure, no DB, no side effects
- [x] `lib/sharedSignals.test.ts` — covers biasTone × all phases × all readiness labels, null cycleDay, all extras passthrough
- [x] `AppContext` — `dailySignals` useMemo depends on same inputs as `todayState`, recomputes on check-in save
- [x] Training — symptoms/energy/goal now flow; cycleDay null guard preserves rotation logic
- [x] Meals — banner tight: headline + first sentence only; hidden when `todayState` null
- [x] Insights — hidden for generic-stage users; richer layout than Dashboard (full body text, section heading)
- [x] No domain engines modified (`trainingEngine`, `exerciseSelector`, `progressionEngine`, `dailyPlan`, `supabase`)
- [x] No DB migrations required
- [x] All fallback behaviour preserved via `?? defaults`
