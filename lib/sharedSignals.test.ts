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
