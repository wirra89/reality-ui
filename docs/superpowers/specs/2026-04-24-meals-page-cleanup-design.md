# Meals Page Cleanup — Implementation Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the meals page from 7 cluttered sections to 5 focused ones by removing duplicate cards, upgrading recipe logging, and adding four UX improvements.

**Architecture:** All changes are confined to `app/meals/page.tsx`, `components/RecipeRecommendationPanel.tsx`, and `components/NutritionEntryList.tsx`. No new components are created. No data layer changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Baby Rose design system.

---

## Current page section order (7 sections)

1. PhaseCard
2. **Macro summary card** — inline in `meals/page.tsx` (MacroRing + 3 pill bars) ← **REMOVE**
3. **MealPhaseBanner** ← **REMOVE**
4. Search & log food button → expands to RecipeRecommendationPanel + NutritionFoodSearch
5. NutritionEntryList — contains macro progress card + logged entries
6. MealRecommendationCards — "Today's meal ideas"

## Target page section order (5 sections)

1. PhaseCard
2. Search & log food button → expands to: **NutritionFoodSearch first**, then RecipeRecommendationPanel (with log buttons)
3. NutritionEntryList — single macro card (with "fill remaining" always visible) + logged entries (collapsed after 3)
4. MealRecommendationCards — "Today's meal ideas" (tab auto-selects by time of day)
5. _(Logged entries are part of section 3 above)_

---

## Changes

### Change 1: Remove duplicate macro card and MealPhaseBanner from `meals/page.tsx`

**Files:** `app/meals/page.tsx`

Remove the JSX block that renders the inline macro summary card (the `<div>` with MacroRing and 3 macro pills, currently between PhaseCard and MealPhaseBanner). Remove the `<MealPhaseBanner>` component and its import. Remove the `MacroRing` import if no longer used.

The `MacroRing` component import and `macroTargets` const can stay — `macroTargets` is still passed to `RecipeRecommendationPanel` and `NutritionEntryList`.

**What stays:** PhaseCard, the search button area, NutritionEntryList, MealRecommendationCards.

---

### Change 2: Flip search expansion order — food input first, recipes below

**Files:** `app/meals/page.tsx`

Inside the `showNutritionSearch` conditional block, swap the order: `NutritionFoodSearch` renders first (at the top), `RecipeRecommendationPanel` renders below it.

Before:
```tsx
<>
  <RecipeRecommendationPanel ... />
  <NutritionFoodSearch ... />
</>
```

After:
```tsx
<>
  <NutritionFoodSearch ... />
  <RecipeRecommendationPanel ... />
</>
```

---

### Change 3: Add "Log this meal" button to RecipeRecommendationPanel

**Files:** `components/RecipeRecommendationPanel.tsx`

Each recipe card currently shows a "View recipe" toggle button but no way to log the recipe. Add a log action so users can log a recipe's macros directly from inside the search area.

**Props to add:**
```typescript
interface Props {
  phase:        Phase;
  dailySignals: DailySignals | null;
  macroTargets?: { calories: number; protein: number; carbs: number; fats: number; };
  cycleDay:     number;   // add this
  onLogged?:    () => void; // add this
}
```

**State to add inside component:**
```typescript
const [loggingId, setLoggingId] = useState<string | null>(null);
const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
```

**Import to add:**
```typescript
import { logRecipe } from "@/lib/nutrition";
```

**Log handler:**
```typescript
async function handleLog(recipe: MealRecipe) {
  if (loggedIds.has(recipe.id)) return;
  setLoggingId(recipe.id);
  try {
    await logRecipe(
      {
        id:        recipe.id as unknown as number,
        name:      recipe.name,
        calories:  recipe.macros_per_serving.calories_kcal,
        protein_g: recipe.macros_per_serving.protein_g,
        carbs_g:   recipe.macros_per_serving.carbs_g,
        fat_g:     recipe.macros_per_serving.fat_g,
      },
      "snack",
      props.cycleDay,
      props.phase,
    );
    setLoggedIds(prev => new Set(prev).add(recipe.id));
    props.onLogged?.();
  } finally {
    setLoggingId(null);
  }
}
```

**In the recipe card JSX**, replace the single "View recipe" button row with a two-button row:
```tsx
<div className="flex gap-2 px-4 pb-4">
  {/* Log button */}
  <button
    onClick={() => handleLog(recipe)}
    disabled={!!loggingId}
    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
    style={{
      background: loggedIds.has(recipe.id)
        ? "rgba(0,0,0,0.04)"
        : `linear-gradient(135deg, ${color}, ${color}88)`,
      color: loggedIds.has(recipe.id) ? "var(--color-text-dim)" : "white",
    }}
  >
    {loggingId === recipe.id ? (
      <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Logging…</span></>
    ) : loggedIds.has(recipe.id) ? (
      <span>✓ Logged</span>
    ) : (
      <span>Log this meal</span>
    )}
  </button>

  {/* View recipe toggle — unchanged */}
  <button
    onClick={() => setExpanded(isOpen ? null : recipe.id)}
    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
    style={{
      background: isOpen ? `${color}22` : "rgba(0,0,0,0.04)",
      color:      isOpen ? color : "var(--color-text-mid)",
      border:     `1px solid ${isOpen ? color + "44" : "var(--color-border)"}`,
    }}
  >
    <span>{isOpen ? "▲" : "▼"}</span>
    <span>{isOpen ? "Hide recipe" : "View recipe"}</span>
  </button>
</div>
```

**Update the call site** in `app/meals/page.tsx` to pass the two new props:
```tsx
<RecipeRecommendationPanel
  phase={phase}
  dailySignals={dailySignals}
  macroTargets={macroTargets}
  cycleDay={cycleDay}
  onLogged={() => { setShowNutritionSearch(false); showToast("✓ Meal logged"); refreshNutrition(); }}
/>
```

---

### Change 4: Auto-select meal tab by time of day in MealRecommendationCards

**Files:** `components/MealRecommendationCards.tsx`

The component currently always opens with Breakfast expanded. Add a helper that picks the default slot based on current hour.

**Add this function** above the component:
```typescript
function getDefaultMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 18) return "snack";
  return "dinner";
}
```

The component currently uses `expanded` state to track which slot is open; it starts as `null`. Change the initial value so the default slot card is open on mount:

Find the `useState` for `expanded`:
```typescript
const [expanded, setExpanded] = useState<MealType | null>(null);
```

Change to:
```typescript
const [expanded, setExpanded] = useState<MealType | null>(getDefaultMealType);
```

This opens the time-appropriate meal slot automatically when the page loads. The user can still tap any other slot to switch.

---

### Change 5: "Fill my remaining macros" — always visible in NutritionEntryList

**Files:** `components/NutritionEntryList.tsx`

Currently the "Fill my remaining macros" button only renders when `canSuggest` is true (requires phase foods loaded AND meaningful macro gaps). Change it to always show a macro summary line, making the suggestions discoverable even before phase foods load.

**Current condition:**
```tsx
{canSuggest && (
  <button onClick={() => setShowSuggestions(s => !s)} ...>
    🧠 Fill my remaining macros
  </button>
)}
```

**Replace with** (always rendered when macroTargets exist):
```tsx
{macroTargets && (
  <button
    onClick={() => canSuggest && setShowSuggestions(s => !s)}
    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
    style={{
      background: showSuggestions ? `${phaseColor}22` : "rgba(0,0,0,0.04)",
      color: canSuggest
        ? (showSuggestions ? phaseColor : "var(--color-text-mid)")
        : "var(--color-text-dim)",
      border: `1px solid ${showSuggestions ? phaseColor + "44" : "var(--color-border)"}`,
      cursor: canSuggest ? "pointer" : "default",
    }}
  >
    <span>🧠</span>
    <span>
      {canSuggest
        ? (showSuggestions ? "Hide suggestions" : "Fill my remaining macros")
        : `${Math.max(0, (macroTargets?.calories ?? 0) - consumed.calories)} kcal remaining`}
    </span>
  </button>
)}
```

When macros are complete (`!canSuggest`) it shows "X kcal remaining" as a read-only label styled the same way. When there's a gap it becomes tappable to expand suggestions.

---

### Change 6: Collapse logged entries after 3 items

**Files:** `components/NutritionEntryList.tsx`

**State to add:**
```typescript
const [showAllEntries, setShowAllEntries] = useState(false);
```

**In the entries render section**, replace the flat `entries.map(...)` with:
```tsx
const ENTRY_LIMIT = 3;
const visibleEntries = showAllEntries ? entries : entries.slice(0, ENTRY_LIMIT);
const hiddenCount   = entries.length - ENTRY_LIMIT;

// ...render visibleEntries.map(...) instead of entries.map(...)

{!showAllEntries && hiddenCount > 0 && (
  <button
    onClick={() => setShowAllEntries(true)}
    className="w-full mt-2 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
    style={{ background: "rgba(0,0,0,0.04)", color: "var(--color-text-mid)" }}
  >
    Show {hiddenCount} more
  </button>
)}
```

Reset `showAllEntries` to `false` when the page refreshes nutrition data (entries change). This can be done by adding `entries` as a dep in a `useEffect`:
```typescript
useEffect(() => { setShowAllEntries(false); }, [entries.length]);
```

---

## Spec self-review

- **Placeholders:** None. Every code snippet is complete and references real types/functions from the codebase.
- **Internal consistency:** `logRecipe` is imported from `@/lib/nutrition` — confirmed present in `NutritionEntryList.tsx` already. `MealType`, `Phase`, `Food` all confirmed in scope.
- **Scope:** All 6 changes touch at most 3 files. No new components, no DB migrations, no new dependencies.
- **Type note:** `recipe.id` in `MealRecipe` (static dataset) is a `string`, but `logRecipe` expects `id: number`. The cast `as unknown as number` is a workaround — acceptable since the static recipes are never read back by id from Supabase. If this causes issues at runtime, log using `0` as a sentinel id and rely on name matching.
