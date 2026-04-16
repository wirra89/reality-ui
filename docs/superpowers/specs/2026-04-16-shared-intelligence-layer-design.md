# Shared Intelligence Layer — Design Spec

> **Status:** Approved  
> **Date:** 2026-04-16  
> **Author:** wirra89 + Claude

---

## Summary

This change introduces a shared derived intelligence layer for HerPhase that improves coherence across Dashboard, Training, Meals, and Insights without rewriting existing domain engines. The new `dailySignals` contract is not a second source of truth; it is a narrow, derived view of the existing daily state, designed specifically for downstream domain engines and UI wiring. Adoption is incremental, tab-specific, and fully backward-compatible through null guards and existing fallback behaviour.

---

## Problem

The central engine (`lib/dailyPlan.ts` → `generateTodayState()`) already computes readiness, meal focus, and insight copy, and `AppContext` already distributes `todayState` app-wide. However, domain engines and tab UIs do not consistently consume it:

| Tab | Gap |
|---|---|
| Training | Re-derives `readinessLabel` and `readinessScore` from `todayState` manually; `symptoms`, `energy`, and `goal` hardcoded to `[]`, `null`, `null` |
| Meals | `todayState.mealFocus` is computed but never displayed |
| Insights | `todayState.insightTitle` / `insightBody` are computed but only shown on Dashboard |
| Dashboard | Already consuming `todayState` correctly via `AIRecommendationCard` / `ReadinessCard` |

The result: training recommendations ignore check-in symptoms and energy, and meal + insight guidance feel disconnected from the user's actual daily state.

---

## Architecture

```
AppContext
    ├── todayState: TodayState          ← existing central engine output
    └── dailySignals: DailySignals      ← new narrow derived contract
              ↓
    TrainingIntelligenceCard  →  buildTrainingInput(dailySignals)
    MealsPage                 →  todayState.mealFocus banner
    InsightsPage              →  todayState.insightTitle / insightBody (richer layout)
```

One new file. Two context additions. Three UI wires. No domain engine rewrites.

---

## New File: `lib/sharedSignals.ts`

Pure function, no DB calls, no side effects.

### Types

```typescript
import type { Phase } from "@/types/recipe";
import type { TodayState, ReadinessLabel } from "@/lib/dailyPlan";

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
```

### `biasTone` derivation

| Condition | Result |
|---|---|
| `readinessLabel === "rest"` | `"recover"` |
| `readinessLabel === "peak"` AND `phase` in `["follicular", "ovulation"]` | `"push"` |
| Everything else | `"neutral"` |

### `extractDailySignals`

```typescript
export function extractDailySignals(
  todayState: TodayState,
  extras: {
    phase:        Phase;      // prefer todayState.phase if available
    cycleDay:     number | null;
    symptomFlags: string[];
    energy:       number | null;
    mood:         number | null;
    primaryGoal:  string | null;
  }
): DailySignals
```

`phase` is passed via `extras.phase`, computed by `getPhase(cycleDay, cycleParams)` in the caller. If `TodayState` ever gains a top-level `phase` field in future, `extractDailySignals` can prefer it without changing callers.

---

## AppContext changes (`context/AppContext.tsx`)

Two additions, no breaking changes.

### Interface addition

```typescript
dailySignals: DailySignals | null;
```

### Computation

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

Depends on the same inputs as `todayState` — recomputes together whenever check-in is saved via `refreshTodayState()`.

`dailySignals` is exposed in the context value alongside `todayState`.

---

## Tab adoption

### 1. Training — `components/TrainingIntelligenceCard.tsx`

Replace manual extraction of `readinessScore` / `readinessLabel` with `dailySignals`:

```typescript
const { dailySignals, cycleDay, cycleParams } = useApp();

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

Effect: a user who logs cramps will now automatically see lower HIIT scores. A user with energy=5 and peak readiness will see strength/HIIT recommended. Previously these signals were silently dropped.

**`cycleDay` null guard:** `trainingEngine` uses `cycleDay` for tie-breaking rotation (not just display). If `dailySignals.cycleDay` is null, fall back to raw `cycleDay` from context — do not default to 1 unless both are null.

### 2. Meals — `app/meals/page.tsx`

Add a phase-aware banner above `MealRecommendationCards`. Source: `todayState.mealFocus`.

Layout:
```
[headline]           ← todayState.mealFocus.headline
[one short sentence] ← todayState.mealFocus.body, truncated to first sentence only
[MealRecommendationCards ...]
```

The banner must not become a wall of text. One sentence maximum. If `mealFocus.body` contains multiple sentences, display only the first.

Show banner only when `todayState` is non-null. No loading state needed — if `todayState` is null the banner is simply absent.

### 3. Insights — `app/insights/page.tsx`

Surface `todayState.insightTitle` and `todayState.insightBody` in the overview tab.

Presentation differs from Dashboard intentionally:
- **Dashboard** = condensed card (title + 1–2 lines, summary format)
- **Insights overview tab** = same content, more breathing room — title as a section heading, body rendered in full with slightly larger type and more vertical padding

This is the same data, not different logic. The difference is layout density: Dashboard is a glanceable card; Insights is a reading context.

Show only when `todayState?.dataMaturityStage !== "generic"` — generic-stage users see the phase-guidance banner instead (already implemented).

---

## Migration path

Delivery order — each step independently shippable and backward-compatible:

| Step | Change | Visible impact |
|---|---|---|
| 1 | `lib/sharedSignals.ts` + AppContext wire | None — pure logic addition |
| 2 | Training consumes `dailySignals` | Symptoms/energy/goal flow into workout scoring |
| 3 | Meals banner | `mealFocus` shown above meal cards |
| 4 | Insights insight section | `insightTitle/insightBody` shown in overview tab |

No tab adoption blocks another. Existing fallback behaviour is preserved at every step via null guards.

---

## What does NOT change

- `lib/dailyPlan.ts` — no modifications
- `lib/trainingEngine.ts` — no modifications
- `lib/exerciseSelector.ts` — no modifications
- `lib/progressionEngine.ts` — no modifications
- `lib/supabase.ts` — no modifications
- No DB migrations required

---

## Testing

- `lib/sharedSignals.ts` is pure — unit-testable with no mocks
- Key cases: `biasTone` derivation for all phase × readinessLabel combos, null `cycleDay` propagation, `phase` preference from `todayState` vs extras
- Existing `trainingEngine` tests unchanged — `buildTrainingInput` signature is unchanged
- UI wires (meals banner, insights section) tested by toggling `todayState` presence in dev

---

## Open questions (none blocking)

- `TodayState` does not currently expose `phase` as a top-level field. If added to `dailyPlan.ts` in future, the `extractDailySignals` fallback becomes cleaner. Not required for this work.
