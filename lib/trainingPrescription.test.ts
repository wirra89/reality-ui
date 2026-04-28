import { describe, it, expect } from "vitest";
import { PHASE_MATRIX, getLutealSubPhase } from "./trainingPrescription";

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
      expect(row.rir[0]).toBeLessThanOrEqual(row.rir[1]);
      expect(row.restSeconds[0]).toBeLessThanOrEqual(row.restSeconds[1]);
    }
  });
});

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
