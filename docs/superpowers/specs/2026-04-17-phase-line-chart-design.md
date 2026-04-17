# Phase Line Chart — Design Spec

> **Status:** Approved
> **Date:** 2026-04-17
> **Author:** wirra89 + Claude

---

## Summary

Introduce `PhaseLineChart` as a shared SVG chart foundation for HerPhase. `WeightChart` becomes a thin adapter on top of it. The PR history tab gains its first chart, with points coloured by cycle phase using data already recorded on each PR entry. No new DB tables or queries required.

---

## Problem

`WeightChart` is a monolithic SVG component that duplicates chart logic already partially re-implemented inline in `app/weight/page.tsx`. There is no shared chart infrastructure, so adding a second chart (PR progression) would mean a third copy of the same SVG boilerplate. Phase-aware point colouring — the most differentiating feature of the app — is discarded in every chart context.

| Consumer | Current state |
|---|---|
| `app/weight/page.tsx` | Uses `WeightChart`; also has its own duplicate SVG chart inline |
| `app/history/page.tsx` | Uses `WeightChart compact` — works, but type-couples to `WeightLog` |
| `app/prs/page.tsx` history tab | List only — no chart at all |

---

## Architecture

```
lib/chartTypes.ts          ← shared types: SeriesPoint, LineSeries, PhaseBand
components/PhaseLineChart.tsx  ← shared SVG chart engine (new)
components/WeightChart.tsx     ← thin adapter (modified — delegates to PhaseLineChart)
app/prs/page.tsx               ← adds PhaseLineChart inline in history tab (modified)
app/weight/page.tsx            ← removes inline SVG, parent maps WeightLog → {date,weight} (modified)
app/history/page.tsx           ← parent maps WeightLog → {date,weight} (modified)
```

One new file. One new component. Three lightweight call-site changes.

---

## New File: `lib/chartTypes.ts`

Pure types — no logic, no imports beyond the Phase type.

```typescript
import type { Phase } from "@/types/recipe";

export interface SeriesPoint {
  date:   string;   // ISO date string "YYYY-MM-DD"
  value:  number;
  phase?: Phase;    // present when pointColorMode === "phase"
}

export interface LineSeries {
  id:     string;
  label:  string;
  color:  string;   // line colour; also used for points in "series" mode
  points: SeriesPoint[];
}

export interface PhaseBand {
  phase:     Phase;
  startDate: string;  // ISO date
  endDate:   string;  // ISO date
  color:     string;  // semi-transparent fill e.g. "rgba(52,211,153,0.08)"
}
```

---

## New Component: `components/PhaseLineChart.tsx`

Pure SVG chart. No DB calls, no context reads. All inputs via props.

### Props

```typescript
interface Props {
  series:           LineSeries[];
  phaseBands:       PhaseBand[];       // pass [] to suppress bands
  windowDays?:      number;            // default 60 — clips to last N days
  yMin?:            number;            // explicit y-axis floor (auto if omitted)
  yMax?:            number;            // explicit y-axis ceiling (auto if omitted)
  height?:          number;            // default 140
  compact?:         boolean;           // reduces height and label density
  showLegend?:      boolean;           // default: series.length > 1
  showPoints?:      boolean;           // default false — renders a dot per point
  pointColorMode?:  "series" | "phase"; // default "series"
}
```

### Phase dot colour map

Internal to `PhaseLineChart`. Not exported.

```typescript
const PHASE_DOT_COLORS: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};
```

When `pointColorMode === "phase"`, each dot uses `PHASE_DOT_COLORS[point.phase]` if `point.phase` is set, falling back to the series `color`.

When `pointColorMode === "series"` (default), all dots use the series `color`.

### Rendering behaviour

- `windowDays`: filter all series points to `date >= today - windowDays` before rendering. Applied before y-axis auto-scaling.
- Y-axis: auto-scales to `[min(values) - padding, max(values) + padding]` across all series. `yMin` / `yMax` override the auto values.
- Grid: 3 horizontal grid lines at 25 / 50 / 75 % of y range.
- Phase bands: rendered as semi-transparent `rect` fills behind the grid, clipped to the x-axis range of the data.
- Multiple series: rendered in Z order (index 0 behind, last series on top). Legend shown below chart when `showLegend` is true.
- `showPoints: false` (default): only render first and last point dots per series.
- `showPoints: true`: render a dot at every point.

### What PhaseLineChart does NOT do

- No DB access.
- No cycle computation.
- No mapping from `WeightLog` or `PersonalRecord` to `LineSeries` — callers own that.
- No derived phase band computation — if `phaseBands` is empty, no bands are drawn. The PR chart explicitly passes `[]`.

---

## Modified: `components/WeightChart.tsx`

Becomes a thin adapter. The `WeightLog` type is no longer imported here.

### New props

```typescript
interface Props {
  logs:        { date: string; weight: number }[];  // parent maps WeightLog → this
  phaseBands?: PhaseBand[];                          // optional; not passed initially
  compact?:    boolean;
}
```

### Internal wiring

```typescript
const series: LineSeries[] = [{
  id:     "weight",
  label:  "Weight",
  color:  "#C48A97",
  points: logs.map(l => ({ date: l.date, value: l.weight })),
}];

return (
  <PhaseLineChart
    series={series}
    phaseBands={phaseBands ?? []}
    compact={compact}
    showPoints={false}
  />
);
```

No SVG logic remains in `WeightChart`. The minimum-2-entries guard (`if logs.length < 2 return null`) is preserved.

---

## Modified: Call sites — WeightLog mapping moves to parent

Both callers map `WeightLog[]` → `{ date: string; weight: number }[]` before passing in. `WeightLog` is `{ id?, date, weight_kg, note? }`, so the mapping is:

```typescript
logs.map(l => ({ date: l.date, weight: l.weight_kg }))
```

**`app/weight/page.tsx`:**
- Remove the inline duplicate SVG chart (the `getChartPoints` / `getAreaPath` functions and their `<svg>` block).
- Pass mapped logs to `WeightChart`:
  ```tsx
  <WeightChart logs={logs.map(l => ({ date: l.date, weight: l.weight_kg }))} />
  ```

**`app/history/page.tsx`:**
```tsx
<WeightChart
  logs={[...weights].reverse().map(l => ({ date: l.date, weight: l.weight_kg }))}
  compact
/>
```

---

## Modified: `app/prs/page.tsx` — PR chart in history tab

A `PhaseLineChart` is added at the top of the history tab, above the log list. It renders only when there are ≥ 2 entries for the currently-selected (or most-recent) exercise.

### Exercise selection

The history tab gains a single-line exercise filter — a horizontal scrollable list of exercise names from `prs` (deduped, sorted by most-recent). Tapping a name filters the list and the chart. Default: the exercise with the most PR entries.

### Series derivation

```typescript
const chartPRs = prs
  .filter(pr => pr.exercise === selectedExercise)
  .sort((a, b) => a.logged_at.localeCompare(b.logged_at));

const series: LineSeries[] = [{
  id:     "pr-weight",
  label:  selectedExercise,
  color:  "#C48A97",
  points: chartPRs.map(pr => ({
    date:  pr.logged_at,
    value: pr.weight,
    phase: pr.phase as Phase,
  })),
}];
```

### PhaseLineChart call

```tsx
{chartPRs.length >= 2 && (
  <PhaseLineChart
    series={series}
    phaseBands={[]}
    showPoints={true}
    pointColorMode="phase"
    showLegend={false}
    height={120}
  />
)}
```

No `phaseBands` derived from current cycle — phase context comes from the `phase` field recorded on each PR at log time.

---

## What does NOT change

- `lib/supabase.ts` — no modifications, `WeightLog` and `PersonalRecord` types unchanged
- `lib/cycle.ts` — no modifications
- PR logging logic — no modifications
- The PR "Bests" tab — no modifications
- History tab workout/meals/mood tabs — no modifications
- `app/weight/page.tsx` stats cards and log form — no modifications

---

## Migration path

Each step is independently shippable:

| Step | Change | Visible impact |
|---|---|---|
| 1 | `lib/chartTypes.ts` | None — types only |
| 2 | `components/PhaseLineChart.tsx` | None — unused until wired |
| 3 | Refactor `WeightChart` to delegate + update call sites | WeightChart renders identically |
| 4 | PR history tab chart | New chart visible for users with ≥ 2 PRs on one exercise |

---

## Testing

- `PhaseLineChart` is pure props-in / SVG-out — test by rendering with varied inputs: empty series, single series, two series, `windowDays` clipping, `yMin/yMax` override, `showPoints` + both `pointColorMode` values, empty `phaseBands`, non-empty `phaseBands`.
- `WeightChart` adapter: confirm it renders `null` for `logs.length < 2` and delegates cleanly otherwise.
- PR chart: confirm it is absent with < 2 entries and present with ≥ 2 entries for the selected exercise.
- Regression: `app/weight/page.tsx` chart visually identical before and after removal of inline SVG.
