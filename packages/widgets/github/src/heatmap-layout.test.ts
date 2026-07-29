import { describe, expect, it } from "vitest";
import type { ContributionWeek } from "@pulse/adapter-github";
import { computeMonthLabels } from "./heatmap-layout";

/** Builds a run of consecutive-date weeks (7 days each) starting at
 *  `startDate`, mimicking GitHub's Sunday-aligned week grouping without
 *  needing to hand-compute real weekday alignment for the test year. */
function buildWeeks(startDate: string, totalDays: number): ContributionWeek[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    return { date: date.toISOString().slice(0, 10), count: 0, level: 0 };
  });

  const weeks: ContributionWeek[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ days: days.slice(i, i + 7) });
  }
  return weeks;
}

describe("computeMonthLabels", () => {
  it("labels the week column containing each month's 1st day", () => {
    // 2026-01-01 through 2026-03-01 or so, no leading/trailing padding.
    const weeks = buildWeeks("2026-01-01", 63);

    const labels = computeMonthLabels(weeks, 2026);

    expect(labels[0]).toEqual({ weekIndex: 0, label: "Jan" });
    const feb = labels.find((l) => l.label === "Feb");
    expect(feb?.weekIndex).toBeGreaterThan(0);
    const mar = labels.find((l) => l.label === "Mar");
    expect(mar?.weekIndex).toBeGreaterThan(feb!.weekIndex);
  });

  it("ignores leading padding from the previous December (never reaches day 01, at most 6 days)", () => {
    // Week 0 starts a few days before Jan 1, 2026 — simulating Sunday-alignment padding.
    const weeks = buildWeeks("2025-12-28", 70);

    const labels = computeMonthLabels(weeks, 2026);

    expect(labels.find((l) => l.label === "Dec")).toBeUndefined();
    expect(labels[0]?.label).toBe("Jan");
  });

  it("ignores trailing padding into the following January", () => {
    // A full year of 2026 plus a few trailing days that spill into 2027.
    const weeks = buildWeeks("2026-01-01", 370);

    const labels = computeMonthLabels(weeks, 2026);

    // Only one "Jan" label — the real start of 2026, not a second one for
    // the trailing 2027 padding days.
    const janLabels = labels.filter((l) => l.label === "Jan");
    expect(janLabels).toHaveLength(1);
    expect(labels.at(-1)?.label).toBe("Dec");
  });

  it("handles a leap year's Feb 29 without disrupting month detection", () => {
    const weeks = buildWeeks("2028-01-01", 366); // 2028 is a leap year

    const labels = computeMonthLabels(weeks, 2028);

    expect(labels.map((l) => l.label)).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
  });

  it("returns no labels for an empty weeks array", () => {
    expect(computeMonthLabels([], 2026)).toEqual([]);
  });
});
