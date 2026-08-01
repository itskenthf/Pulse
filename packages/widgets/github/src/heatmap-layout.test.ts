import { describe, expect, it } from "vitest";
import type { ContributionWeek } from "@pulse/adapter-github";
import { computeMonthLabels, selectRecentWeeks } from "./heatmap-layout";

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

describe("selectRecentWeeks", () => {
  it("picks the weeks leading up to today, not the tail of the full year (the bug this guards against)", () => {
    // Full year of 2026 — "today" is early August, so November/December
    // are all future zero-padded days per fetchContributions' own
    // comment. A naive weeks.slice(-4) would return those, not the real
    // recent weeks.
    const weeks = buildWeeks("2026-01-01", 365);
    const fetchedAt = "2026-08-01T12:00:00.000Z";

    const recent = selectRecentWeeks(weeks, fetchedAt, 4);

    expect(recent).toHaveLength(4);
    for (const week of recent) {
      expect(week.days.some((day) => day.date <= "2026-08-01")).toBe(true);
    }
    // None of the returned weeks are pure-future (Nov/Dec) padding.
    expect(recent.some((week) => week.days.every((day) => day.date > "2026-08-01"))).toBe(false);
  });

  it("returns fewer than count weeks when there isn't enough history yet (e.g. early January)", () => {
    const weeks = buildWeeks("2026-01-01", 365);
    const fetchedAt = "2026-01-10T00:00:00.000Z";

    const recent = selectRecentWeeks(weeks, fetchedAt, 12);

    expect(recent.length).toBeLessThan(12);
    expect(recent.length).toBeGreaterThan(0);
  });

  it("includes the week containing today even when today has no prior weeks", () => {
    const weeks = buildWeeks("2026-01-01", 7);
    const fetchedAt = "2026-01-03T00:00:00.000Z";

    expect(selectRecentWeeks(weeks, fetchedAt, 4)).toHaveLength(1);
  });
});
