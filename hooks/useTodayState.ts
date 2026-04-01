// hooks/useTodayState.ts
// Convenience hook for accessing TodayState without importing useApp directly.
// Keeps component imports clean — components that only need todayState
// don't need to know about the full AppContext shape.

import { useApp } from "@/context/AppContext";
import type { TodayState } from "@/lib/dailyPlan";

/**
 * Returns the current TodayState from AppContext.
 * Returns null while loading or if the user is not logged in.
 *
 * @example
 * const todayState = useTodayState();
 * if (!todayState) return <Skeleton />;
 * const { readinessScore, workoutRecommendation, mealFocus } = todayState;
 */
export function useTodayState(): TodayState | null {
  const { todayState } = useApp();
  return todayState;
}

/**
 * Returns true if todayState was computed from a real check-in
 * (as opposed to phase-only baseline).
 */
export function useTodayStateIsPersonalized(): boolean {
  const { todayState } = useApp();
  return todayState?.adaptedFromCheckin ?? false;
}

/**
 * Returns the data maturity stage for conditional rendering.
 * Use to decide whether to show generic or personalized insight copy.
 */
export function useDataMaturity() {
  const { todayState, logCount } = useApp();
  return {
    stage:         todayState?.dataMaturityStage ?? "generic",
    logCount,
    isGeneric:     todayState?.dataMaturityStage === "generic",
    isEarly:       todayState?.dataMaturityStage === "early",
    isPersonalized: todayState?.dataMaturityStage === "personalized",
  };
}
