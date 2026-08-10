import { describe, expect, it } from "vitest";
import { mealSkipPatternInsight, type MealHistoryPoint } from "./meal-skip-pattern";

function day(loggedOn: string, overrides: Partial<MealHistoryPoint> = {}): MealHistoryPoint {
  return { loggedOn, breakfast: true, lunch: true, dinner: true, snack: true, ...overrides };
}

describe("mealSkipPatternInsight", () => {
  it("returns null with no history", () => {
    expect(mealSkipPatternInsight([])).toBeNull();
  });

  it("returns null when nothing is skipped", () => {
    const history = [day("2026-08-03"), day("2026-08-10"), day("2026-08-17")];
    expect(mealSkipPatternInsight(history)).toBeNull();
  });

  it("returns null for a single occurrence of a weekday, even if skipped", () => {
    // 2026-08-03 is a Monday — only one Monday in the window.
    const history = [day("2026-08-03", { breakfast: false })];
    expect(mealSkipPatternInsight(history)).toBeNull();
  });

  it("reports a meal reliably skipped on the same weekday", () => {
    // 2026-08-03, 08-10, 08-17 are Mondays; breakfast skipped every time.
    const history = [
      day("2026-08-03", { breakfast: false }),
      day("2026-08-04"),
      day("2026-08-10", { breakfast: false }),
      day("2026-08-11"),
      day("2026-08-17", { breakfast: false }),
    ];
    expect(mealSkipPatternInsight(history)).toBe("You often skip breakfast on Mondays.");
  });

  it("does not flag a weekday skipped less than half the time", () => {
    const history = [
      day("2026-08-03", { breakfast: false }),
      day("2026-08-10"),
      day("2026-08-17"),
    ];
    expect(mealSkipPatternInsight(history)).toBeNull();
  });
});
