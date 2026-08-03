import { describe, expect, it } from "vitest";
import type { ContributionWeek } from "@pulse/adapter-github";
import { computeStreaks } from "./streaks";

const TODAY = new Date("2026-07-29T12:00:00Z");

/** Builds a week starting at `startDate` (YYYY-MM-DD), one day per count. */
function week(startDate: string, counts: number[]): ContributionWeek {
  const start = new Date(`${startDate}T00:00:00Z`);
  return {
    days: counts.map((count, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      return { date: date.toISOString().slice(0, 10), count, level: count > 0 ? 1 : 0 };
    }),
  };
}

describe("computeStreaks", () => {
  it("returns zero for both when every day is empty", () => {
    expect(computeStreaks([week("2026-07-27", [0, 0, 0])], TODAY)).toEqual({
      current: 0,
      longest: 0,
    });
  });

  it("counts a single ongoing streak as both current and longest", () => {
    expect(computeStreaks([week("2026-07-27", [1, 1, 1])], TODAY)).toEqual({
      current: 3,
      longest: 3,
    });
  });

  it("keeps the current streak going through today having no contributions yet", () => {
    // 2026-07-27, 28 had activity; today (2026-07-29) is still zero
    // because it hasn't happened yet — shouldn't break the streak.
    expect(computeStreaks([week("2026-07-27", [1, 1, 0])], TODAY)).toEqual({
      current: 2,
      longest: 2,
    });
  });

  it("breaks the current streak on a real gap, but keeps the longest from earlier", () => {
    // 07-25,26,27 (longest run of 3), gap on 07-28, then 07-29 (current run of 1).
    expect(computeStreaks([week("2026-07-25", [1, 1, 1, 0, 1])], TODAY)).toEqual({
      current: 1,
      longest: 3,
    });
  });

  it("spans multiple weeks", () => {
    expect(
      computeStreaks([week("2026-07-25", [1, 1]), week("2026-07-27", [1, 1])], TODAY),
    ).toEqual({ current: 4, longest: 4 });
  });

  it("excludes trailing future zero-days from both current and longest — a full calendar year is padded through Dec 31", () => {
    const withFuturePadding = [
      week("2026-07-27", [1, 1, 1]),
      // 2026-07-30 through 2026-08-05: the future, always zero.
      week("2026-07-30", [0, 0, 0, 0, 0, 0, 0]),
    ];

    expect(computeStreaks(withFuturePadding, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it("doesn't let a future day's zero count be mistaken for 'today hasn't happened yet'", () => {
    // Without filtering to today, the naive "last day in the array" check
    // would see 2026-08-05 (zero, far in the future) and wrongly treat it
    // as today's not-yet-logged contribution, extending the streak through
    // every future zero-day. Filtering to real past-or-today days first
    // fixes this.
    const withFuturePadding = [
      week("2026-07-20", [1, 1, 1, 1, 1, 1, 1]), // a 7-day streak ending 07-26
      week("2026-07-27", [0, 0, 0]), // a real gap: 07-27, 28, 29 (today) all zero
      week("2026-07-30", [0, 0, 0, 0, 0, 0, 0]), // future padding
    ];

    expect(computeStreaks(withFuturePadding, TODAY)).toEqual({ current: 0, longest: 7 });
  });

  it("treats 'today' by the reference timezone (UTC+8), not UTC", () => {
    // 2026-07-30T02:00:00Z is still 2026-07-29 in UTC, but already
    // 2026-07-30 in Asia/Kuching (UTC+8) — a naive UTC date string would
    // wrongly filter out the 07-30 row as "in the future" and silently
    // operate on the previous day's data for the whole 8-hour window.
    const earlyUtcButNextDayLocally = new Date("2026-07-30T02:00:00Z");
    const weeks = [week("2026-07-27", [1, 1, 1, 1])]; // 07-27..07-30, all active

    expect(computeStreaks(weeks, earlyUtcButNextDayLocally)).toEqual({
      current: 4,
      longest: 4,
    });
  });
});
