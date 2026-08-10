import { describe, expect, it } from "vitest";
import { generateWeeklySummary } from "./summary";

const blank = {
  mood: null,
  energy: null,
  confidence: null,
  sleepQuality: null,
  biggestAchievement: null,
  biggestStruggle: null,
};

describe("generateWeeklySummary", () => {
  it("returns a fallback line when nothing has been filled in", () => {
    expect(generateWeeklySummary(blank)).toBe("No review filled in yet this week.");
  });

  it("combines mood and energy into one clause when both are set", () => {
    expect(generateWeeklySummary({ ...blank, mood: 4, energy: 3 })).toBe(
      "Mood was good this week, with steady energy.",
    );
  });

  it("falls back to energy alone when only energy is set", () => {
    expect(generateWeeklySummary({ ...blank, energy: 2 })).toBe("Energy was below average this week.");
  });

  it("appends achievement and struggle as their own sentences", () => {
    const result = generateWeeklySummary({
      ...blank,
      mood: 5,
      biggestAchievement: "Shipped the health pillar",
      biggestStruggle: "Sleep",
    });
    expect(result).toBe(
      "Mood was great this week. Biggest win: Shipped the health pillar. Biggest struggle: Sleep.",
    );
  });

  it("appends achievement/struggle even with no ratings at all", () => {
    expect(generateWeeklySummary({ ...blank, biggestAchievement: "Ran 5k" })).toBe(
      "Biggest win: Ran 5k.",
    );
  });

  it("is deterministic — same input always produces the same output", () => {
    const input = { ...blank, mood: 3, sleepQuality: 1 };
    expect(generateWeeklySummary(input)).toBe(generateWeeklySummary(input));
  });
});
