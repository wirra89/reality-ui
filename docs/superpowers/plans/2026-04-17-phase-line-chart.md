# Phase Line Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce `PhaseLineChart` as a shared SVG chart foundation, refactor `WeightChart` to delegate to it, and add a phase-coloured PR progression chart to the PR history tab.

**Architecture:** A new `lib/chartTypes.ts` defines shared types (`SeriesPoint`, `LineSeries`, `PhaseBand`). `PhaseLineChart` is a pure props-in/SVG-out component with no DB access. `WeightChart` becomes a thin adapter — it owns the `WeightLog → LineSeries` mapping so call sites stay simple. The PR history tab uses `PhaseLineChart` directly with `showPoints: true` and `pointColorMode: "phase"`, using the `phase` already stored on each `PersonalRecord`.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Vitest (pure function tests only — no DOM renderer configured)

---

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/chartTypes.ts` | Shared types: `SeriesPoint`, `LineSeries`, `PhaseBand` |
| Create | `components/PhaseLineChart.tsx` | SVG chart engine — all rendering logic lives here |
| Modify | `components/WeightChart.tsx` | Thin adapter: map `{date,weight}[]` → `LineSeries`, delegate to `PhaseLineChart` |
| Modify | `app/weight/page.tsx` | Remove duplicate inline SVG; map `WeightLog → {date,weight}` before passing to `WeightChart` |
| Modify | `app/history/page.tsx` | Map `WeightLog → {date,weight}` before passing to `WeightChart` |
| Modify | `app/prs/page.tsx` | Add `selectedExercise` state, exercise filter, `PhaseLineChart` in history tab |

---

## Task 1: `lib/chartTypes.ts` — shared chart types

**Files:**
- Create: `lib/chartTypes.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/chartTypes.ts — shared types for PhaseLineChart and its consumers
import type { Phase } from "@/lib/cycle";

export interface SeriesPoint {
  date:   string;   // ISO date "YYYY-MM-DD"
  value:  number;
  phase?: Phase;    // populated when pointColorMode === "phase" (PR chart)
}

export interface LineSeries {
  id:     string;
  label:  string;
  color:  string;   // hex colour for the line; also used for points in "series" mode
  points: SeriesPoint[];
}

export interface PhaseBand {
  phase:     Phase;
  startDate: string;  // ISO date
  endDate:   string;  // ISO date
  color:     string;  // semi-transparent fill e.g. "rgba(52,211,153,0.08)"
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/chartTypes.ts
git commit -m "feat: add shared chart types (SeriesPoint, LineSeries, PhaseBand)"
```

---

## Task 2: `components/PhaseLineChart.tsx` — SVG chart engine

**Files:**
- Create: `components/PhaseLineChart.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

// components/PhaseLineChart.tsx — shared SVG chart engine
// Pure props-in / SVG-out. No DB access, no context reads.

import { useMemo } from "react";
import type { LineSeries, PhaseBand } from "@/lib/chartTypes";
import type { Phase } from "@/lib/cycle";

const PHASE_DOT_COLORS: Record<Phase, string> = {
  menstrual:  "#F87171",
  follicular: "#34D399",
  ovulation:  "#FBBF24",
  luteal:     "#A78BFA",
};

interface Props {
  series:          LineSeries[];
  phaseBands:      PhaseBand[];       // pass [] to suppress bands
  windowDays?:     number;            // default 60 — clips to last N days before scaling
  yMin?:           number;            // explicit y-axis floor (auto-derived if omitted)
  yMax?:           number;            // explicit y-axis ceiling (auto-derived if omitted)
  height?:         number;            // SVG height in px, default 140
  compact?:        boolean;           // reduces bottom padding and label density
  showLegend?:     boolean;           // default: series.length > 1
  showPoints?:     boolean;           // default false — renders a dot per data point
  pointColorMode?: "series" | "phase"; // default "series"
}

export default function PhaseLineChart({
  series,
  phaseBands,
  windowDays     = 60,
  yMin: yMinProp,
  yMax: yMaxProp,
  height         = 140,
  compact        = false,
  showLegend,
  showPoints     = false,
  pointColorMode = "series",
}: Props) {
  const CHART_W       = 340;
  const PAD_TOP       = 10;
  const PAD_RIGHT     = 12;
  const PAD_BOTTOM    = compact ? 18 : 24;
  const PAD_LEFT      = 34;
  const INNER_W       = CHART_W - PAD_LEFT - PAD_RIGHT;
  const INNER_H       = height  - PAD_TOP  - PAD_BOTTOM;

  // ── Window filter ─────────────────────────────────────────────────────────
  const cutoffTs = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - windowDays);
    return d.getTime();
  }, [windowDays]);

  const windowed = useMemo(() =>
    series.map(s => ({
      ...s,
      points: s.points.filter(p => new Date(p.date).getTime() >= cutoffTs),
    })),
  [series, cutoffTs]);

  const allPoints = useMemo(() => windowed.flatMap(s => s.points), [windowed]);

  // Need at least 2 points across all series to render anything meaningful
  if (allPoints.length < 2) return null;

  // ── Scales ────────────────────────────────────────────────────────────────
  const dateTs  = allPoints.map(p => new Date(p.date).getTime());
  const dateMin = Math.min(...dateTs);
  const dateMax = Math.max(...dateTs);
  const dateRange = dateMax - dateMin || 1;

  const values  = allPoints.map(p => p.value);
  const autoMin = Math.min(...values);
  const autoMax = Math.max(...values);
  const yPad    = (autoMax - autoMin) * 0.1 || 1;
  const yMin    = yMinProp ?? autoMin - yPad;
  const yMax    = yMaxProp ?? autoMax + yPad;
  const yRange  = yMax - yMin || 1;

  function toX(dateStr: string): number {
    return PAD_LEFT + ((new Date(dateStr).getTime() - dateMin) / dateRange) * INNER_W;
  }

  function toY(value: number): number {
    return PAD_TOP + (1 - (value - yMin) / yRange) * INNER_H;
  }

  // ── Grid (3 horizontal lines at 25 / 50 / 75 % of y range) ───────────────
  const gridTicks = [0.25, 0.5, 0.75].map(pct => ({
    label: (yMin + pct * yRange).toFixed(1),
    y:     PAD_TOP + (1 - pct) * INNER_H,
  }));

  // ── X-axis date labels ────────────────────────────────────────────────────
  const sorted  = [...allPoints].sort((a, b) => a.date.localeCompare(b.date));
  const firstPt = sorted[0];
  const lastPt  = sorted[sorted.length - 1];
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const shouldShowLegend = showLegend ?? series.length > 1;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${CHART_W} ${height}`}
        className="w-full"
        style={{ height: compact ? Math.min(height, 80) : height }}
      >
        {/* Phase bands — behind everything */}
        {phaseBands.map((band, i) => {
          const x1 = Math.max(PAD_LEFT, toX(band.startDate));
          const x2 = Math.min(CHART_W - PAD_RIGHT, toX(band.endDate));
          if (x2 <= x1) return null;
          return (
            <rect
              key={i}
              x={x1} y={PAD_TOP}
              width={x2 - x1} height={INNER_H}
              fill={band.color}
            />
          );
        })}

        {/* Grid lines */}
        {gridTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT} y1={t.y}
              x2={CHART_W - PAD_RIGHT} y2={t.y}
              stroke="#F3F0F7" strokeWidth="1" strokeDasharray="4 3"
            />
            <text
              x={PAD_LEFT - 4} y={t.y + 3.5}
              textAnchor="end" fontSize="8"
              fill="#C4BED0" fontFamily="system-ui"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Series (index 0 rendered first = behind later series) */}
        {windowed.map((s) => {
          if (s.points.length < 1) return null;

          const ptCoords = s.points.map(p => `${toX(p.date)},${toY(p.value)}`);

          // Area fill for single-series charts only
          const firstX  = toX(s.points[0].date);
          const lastX   = toX(s.points[s.points.length - 1].date);
          const bottomY = PAD_TOP + INNER_H;
          const area = windowed.filter(x => x.points.length > 0).length === 1
            ? `M ${firstX},${bottomY} L ${s.points.map(p => `${toX(p.date)},${toY(p.value)}`).join(" L ")} L ${lastX},${bottomY} Z`
            : null;

          // Dots to render
          const dotPoints = showPoints
            ? s.points
            : [s.points[0], s.points[s.points.length - 1]].filter(
                (p, i, arr) => arr.findIndex(q => q.date === p.date) === i
              );

          return (
            <g key={s.id}>
              {area && (
                <path d={area} fill={s.color} fillOpacity={0.1} />
              )}
              <polyline
                points={ptCoords.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {dotPoints.map((p, pi) => {
                const dotColor =
                  pointColorMode === "phase" && p.phase
                    ? (PHASE_DOT_COLORS[p.phase] ?? s.color)
                    : s.color;
                return (
                  <circle
                    key={pi}
                    cx={toX(p.date)} cy={toY(p.value)}
                    r="3.5"
                    fill="var(--color-surface)"
                    stroke={dotColor}
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          );
        })}

        {/* X-axis labels */}
        <text
          x={PAD_LEFT} y={height - 2}
          fontSize="8" fill="#C4BED0" fontFamily="system-ui"
        >
          {fmtDate(firstPt.date)}
        </text>
        <text
          x={CHART_W - PAD_RIGHT} y={height - 2}
          fontSize="8" fill="#C4BED0" fontFamily="system-ui" textAnchor="end"
        >
          {fmtDate(lastPt.date)}
        </text>
      </svg>

      {/* Legend — rendered outside SVG so it uses HTML text */}
      {shouldShowLegend && (
        <div className="flex flex-wrap gap-3 mt-1.5 px-1">
          {series.map(s => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full"
                style={{ width: 12, height: 2, background: s.color }}
              />
              <span className="text-xs text-dark/50 font-body">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/PhaseLineChart.tsx
git commit -m "feat: add PhaseLineChart SVG chart engine"
```

---

## Task 3: Refactor `components/WeightChart.tsx`

**Files:**
- Modify: `components/WeightChart.tsx`

The current file (82 lines) has its own SVG logic. Replace it entirely with a thin adapter that delegates to `PhaseLineChart`. The `WeightLog` import is removed — the component no longer knows about database types.

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

// components/WeightChart.tsx — thin adapter over PhaseLineChart
// Call sites map WeightLog → { date, weight } before passing in.
import PhaseLineChart from "@/components/PhaseLineChart";
import type { LineSeries, PhaseBand } from "@/lib/chartTypes";

interface Props {
  logs:        { date: string; weight: number }[];
  phaseBands?: PhaseBand[];
  compact?:    boolean;
}

export default function WeightChart({ logs, phaseBands, compact = false }: Props) {
  if (logs.length < 2) return null;

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
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: errors on the two call sites (`app/weight/page.tsx` and `app/history/page.tsx`) because they still pass `WeightLog[]`. That is expected — they will be fixed in Tasks 4 and 5.

- [ ] **Step 3: Commit**

```bash
git add components/WeightChart.tsx
git commit -m "refactor: WeightChart delegates to PhaseLineChart, removes own SVG logic"
```

---

## Task 4: Update `app/weight/page.tsx`

**Files:**
- Modify: `app/weight/page.tsx`

Two changes: (a) remove the duplicate inline SVG chart (`getChartPoints`, `getAreaPath`, and their `<svg>` element), (b) update the `WeightChart` call to pass `logs.map(l => ({ date: l.date, weight: l.weight_kg }))`.

- [ ] **Step 1: Remove the `getChartPoints` function (lines 64–77)**

Delete this block entirely:

```typescript
// DELETE THIS — lines 64–77 in the original file
function getChartPoints(): string {
  if (logs.length < 2) return "";
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = maxW - minW || 1;
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;

  return logs.map((log, i) => {
    const x = padding.left + (i / (logs.length - 1)) * innerW;
    const y = padding.top + (1 - (log.weight_kg - minW) / rangeW) * innerH;
    return `${x},${y}`;
  }).join(" ");
}
```

- [ ] **Step 2: Remove the `getAreaPath` function (lines 79–97)**

Delete this block entirely:

```typescript
// DELETE THIS — lines 79–97 in the original file
function getAreaPath(): string {
  if (logs.length < 2) return "";
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const rangeW = maxW - minW || 1;
  const innerW = chartW - padding.left - padding.right;
  const innerH = chartH - padding.top - padding.bottom;
  const bottomY = padding.top + innerH;

  const points = logs.map((log, i) => {
    const x = padding.left + (i / (logs.length - 1)) * innerW;
    const y = padding.top + (1 - (log.weight_kg - minW) / rangeW) * innerH;
    return `${x},${y}`;
  });

  const firstX = padding.left;
  const lastX  = chartW - padding.right;
  return `M ${firstX},${bottomY} L ${points.join(" L ")} L ${lastX},${bottomY} Z`;
}
```

- [ ] **Step 3: Remove the unused dimension constants (lines 60–63)**

Delete these four lines:

```typescript
// DELETE THIS — lines 60–63 in the original file
const chartW = 340;
const chartH = 120;
const padding = { top: 12, right: 12, bottom: 24, left: 36 };
```

- [ ] **Step 4: Update the `WeightChart` call (around line 150)**

Find:
```tsx
<WeightChart logs={logs} />
```

Replace with:
```tsx
<WeightChart logs={logs.map(l => ({ date: l.date, weight: l.weight_kg }))} />
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: `app/weight/page.tsx` error is resolved. `app/history/page.tsx` still has an error (fixed in Task 5).

- [ ] **Step 6: Commit**

```bash
git add app/weight/page.tsx
git commit -m "refactor: weight page removes duplicate inline SVG, maps WeightLog for WeightChart"
```

---

## Task 5: Update `app/history/page.tsx`

**Files:**
- Modify: `app/history/page.tsx`

One change: update the `WeightChart` call to map `WeightLog → { date, weight }`.

- [ ] **Step 1: Update the WeightChart call (around line 486)**

Find:
```tsx
<WeightChart logs={[...weights].reverse()} compact />
```

Replace with:
```tsx
<WeightChart logs={[...weights].reverse().map(l => ({ date: l.date, weight: l.weight_kg }))} compact />
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/history/page.tsx
git commit -m "fix: history page maps WeightLog for updated WeightChart interface"
```

---

## Task 6: PR chart — history tab in `app/prs/page.tsx`

**Files:**
- Modify: `app/prs/page.tsx`

Add three things to the history tab: (1) `selectedExercise` state derived from `prs`, (2) a horizontal scrollable exercise filter, (3) a `PhaseLineChart` above the list when the selected exercise has ≥ 2 entries.

- [ ] **Step 1: Add imports at the top of the file**

After the existing imports, add:

```typescript
import PhaseLineChart from "@/components/PhaseLineChart";
import type { LineSeries } from "@/lib/chartTypes";
import type { Phase } from "@/lib/cycle";
```

- [ ] **Step 2: Add `selectedExercise` state and derivation inside the component**

Add these after the existing `const [dataLoading, setDataLoading] = useState(true);` line:

```typescript
// ── PR chart state ─────────────────────────────────────────────────────────
// Derive list of exercises ordered by most entries (most-logged = default selection)
const exerciseNames = useMemo(() => {
  const counts: Record<string, number> = {};
  for (const pr of prs) counts[pr.exercise] = (counts[pr.exercise] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}, [prs]);

const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
// Resolve active exercise: user pick → most-entered → null
const activeExercise = selectedExercise ?? exerciseNames[0] ?? null;
```

- [ ] **Step 3: Replace the history tab JSX**

Find the `{/* ── HISTORY TAB ── */}` block (starts around line 285, ends just before the closing `</main>`). Replace the content of the history tab's outer `<div>` with:

```tsx
{/* ── HISTORY TAB ── */}
{tab === "history" && (
  <div>
    {dataLoading ? (
      <div className="space-y-2">
        {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-dark/5 animate-pulse" />)}
      </div>
    ) : prs.length === 0 ? (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-sm font-semibold text-dark/40">No records logged yet</p>
        <button onClick={() => setTab("log")}
          className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}>
          Log first PR
        </button>
      </div>
    ) : (
      <>
        {/* Exercise filter — horizontal scroll, one chip per exercise */}
        {exerciseNames.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
            {exerciseNames.map(name => (
              <button
                key={name}
                onClick={() => setSelectedExercise(name)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
                style={{
                  background: activeExercise === name
                    ? "linear-gradient(135deg, #C48A97, #7B6D8D)"
                    : "var(--color-surface)",
                  color: activeExercise === name
                    ? "var(--color-surface)"
                    : "var(--color-text-dim)",
                  boxShadow: "0 1px 4px rgba(var(--color-text-rgb),0.06)",
                }}>
                {name}
              </button>
            ))}
          </div>
        )}

        {/* PR progression chart — shown when selected exercise has ≥ 2 entries */}
        {(() => {
          if (!activeExercise) return null;
          const chartPRs = prs
            .filter(pr => pr.exercise === activeExercise)
            .sort((a, b) => (a.logged_at ?? "").localeCompare(b.logged_at ?? ""));
          if (chartPRs.length < 2) return null;

          const series: LineSeries[] = [{
            id:     "pr-weight",
            label:  activeExercise,
            color:  "#C48A97",
            points: chartPRs.map(pr => ({
              date:  pr.logged_at ?? "",
              value: pr.weight,
              phase: pr.phase as Phase | undefined,
            })),
          }];

          return (
            <div className="bg-surface rounded-2xl p-4 shadow-card mb-3">
              <p className="text-xs font-semibold text-dark/50 uppercase tracking-wide mb-1">
                {activeExercise} — weight progression
              </p>
              <PhaseLineChart
                series={series}
                phaseBands={[]}
                showPoints={true}
                pointColorMode="phase"
                showLegend={false}
                height={120}
                windowDays={365}
              />
              {/* Phase dot legend */}
              <div className="flex flex-wrap gap-3 mt-2">
                {(["menstrual","follicular","ovulation","luteal"] as const).map(ph => {
                  const colors: Record<string, string> = {
                    menstrual: "#F87171", follicular: "#34D399",
                    ovulation: "#FBBF24", luteal: "#A78BFA",
                  };
                  return (
                    <div key={ph} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors[ph] }} />
                      <span className="text-xs text-dark/40 capitalize font-body">{ph}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* PR log list — filtered to active exercise */}
        <div className="space-y-2">
          {prs
            .filter(pr => !activeExercise || pr.exercise === activeExercise)
            .map((pr) => {
              const ps = pr.phase ? PHASE_STYLES[pr.phase] : null;
              return (
                <div key={pr.id} className="bg-surface rounded-2xl px-4 py-3.5 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-dark">{pr.exercise}</p>
                        {ps && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: ps.bg, color: ps.text }}>
                            {ps.emoji} {pr.phase}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-dark/50 font-body mt-0.5">
                        {pr.reps} reps × {pr.weight}kg · {pr.logged_at}
                      </p>
                      {pr.notes && <p className="text-xs text-dark/35 font-body mt-0.5">{pr.notes}</p>}
                    </div>
                    <button onClick={() => pr.id && handleDelete(pr.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-dark/20 hover:text-rose-400 transition-colors flex-shrink-0"
                      style={{ background: "var(--color-ghost)" }}>
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/prs/page.tsx
git commit -m "feat: add PR progression chart with phase-coloured points to history tab"
```

---

## Final verification

- [ ] **Run the test suite** — confirm existing tests still pass (no regressions in pure lib functions)

Run: `npm test`
Expected: all existing tests pass (`trainingEngine`, `progressionEngine`, `recipeEngine`, `exerciseSelector`, `sharedSignals`)

- [ ] **Verify build compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors, 0 warnings on chart-related files

- [ ] **Manual visual check — weight page**
  1. Open `http://localhost:3000/weight`
  2. Chart renders identically to before (line, area fill, first/last dots, axis labels, grid lines)
  3. With < 2 weight entries: chart is absent (not an error state)

- [ ] **Manual visual check — history weight tab**
  1. Open `http://localhost:3000/history` → weight tab
  2. Compact chart renders correctly (shorter height, same line style)

- [ ] **Manual visual check — PR chart**
  1. Open `http://localhost:3000/prs` → History tab
  2. With 0 or 1 PRs on an exercise: no chart, no crash
  3. With ≥ 2 PRs on same exercise: chart appears above list with coloured dots
  4. Each dot colour matches the phase logged with that PR (red = menstrual, green = follicular, yellow = ovulation, purple = luteal)
  5. Exercise filter chips appear when > 1 exercise exists; tapping switches chart + list
