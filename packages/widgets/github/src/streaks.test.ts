import { describe, expect, it } from "vitest";
import type { ContributionWeek } from "@pulse/adapter-github";
import { computeStreaks } from "./streaks";

function week(counts: number[]): ContributionWeek {
  return { days: counts.map((count, i) => ({ date: `d${i}`, count, level: count > 0 ? 1 : 0 })) };
}

describe("computeStreaks", () => {
  it("returns zero for both when every day is empty", () => {
    expect(computeStreaks([week([0, 0, 0])])).toEqual({ current: 0, longest: 0 });
  });

  it("counts a single ongoing streak as both current and longest", () => {
    expect(computeStreaks([week([1, 1, 1])])).toEqual({ current: 3, longest: 3 });
  });

  it("keeps the current streak going through today having no contributions yet", () => {
    // Yesterday and the day before had activity; "today" (last day) is
    // still zero because it hasn't happened yet — shouldn't break the streak.
    expect(computeStreaks([week([1, 1, 0])])).toEqual({ current: 2, longest: 2 });
  });

  it("breaks the current streak on a real gap, but keeps the longest from earlier", () => {
    // 1,1,1 (longest run of 3), then a gap, then 1 (current run of 1).
    expect(computeStreaks([week([1, 1, 1, 0, 1])])).toEqual({ current: 1, longest: 3 });
  });

  it("spans multiple weeks", () => {
    expect(computeStreaks([week([1, 1]), week([1, 1])])).toEqual({ current: 4, longest: 4 });
  });
});
