import { describe, expect, it } from "vitest";
import { goalAdherenceInsight, type NutritionHistoryPoint } from "./goal-adherence";

function day(overrides: Partial<NutritionHistoryPoint> = {}): NutritionHistoryPoint {
  return {
    loggedOn: "2026-08-01",
    calories: 0,
    proteinG: 0,
    waterMl: 0,
    milkMl: 0,
    ...overrides,
  };
}

describe("goalAdherenceInsight", () => {
  it("returns null when there is no active goal", () => {
    expect(goalAdherenceInsight([day()], null)).toBeNull();
  });

  it("returns null with no history", () => {
    const goal = { metric: "water_ml" as const, targetValue: 2000, comparator: "at_least" as const };
    expect(goalAdherenceInsight([], goal)).toBeNull();
  });

  it("counts an at_least goal correctly", () => {
    const goal = { metric: "water_ml" as const, targetValue: 2000, comparator: "at_least" as const };
    const history = [day({ waterMl: 2500 }), day({ waterMl: 1000 }), day({ waterMl: 2000 })];
    expect(goalAdherenceInsight(history, goal)).toBe("You've hit your water goal 2 of the last 3 days.");
  });

  it("counts an at_most goal correctly", () => {
    const goal = { metric: "calories" as const, targetValue: 2000, comparator: "at_most" as const };
    const history = [day({ calories: 1800 }), day({ calories: 2200 })];
    expect(goalAdherenceInsight(history, goal)).toBe("You've hit your calorie goal 1 of the last 2 days.");
  });
});
