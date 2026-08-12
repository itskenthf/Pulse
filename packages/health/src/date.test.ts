import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentWeekStart, formatRelativeDay, isSundayInTimeZone, isoWeekKey, todayInTimeZone } from "./date";

describe("todayInTimeZone", () => {
  it("formats a given instant as YYYY-MM-DD", () => {
    expect(todayInTimeZone(new Date("2026-08-09T10:00:00Z"))).toBe("2026-08-09");
  });

  it("resolves to the user's time zone, not UTC, near a day boundary", () => {
    // 2026-08-09T23:30:00Z is already 2026-08-10 in Asia/Kuching (UTC+8).
    expect(todayInTimeZone(new Date("2026-08-09T23:30:00Z"))).toBe("2026-08-10");
  });
});

describe("isoWeekKey", () => {
  it("returns the same week key for dates in the same ISO week", () => {
    expect(isoWeekKey("2026-08-03")).toBe(isoWeekKey("2026-08-09"));
  });

  it("returns different week keys across a week boundary", () => {
    expect(isoWeekKey("2026-08-09")).not.toBe(isoWeekKey("2026-08-10"));
  });

  it("handles the year-boundary edge case correctly", () => {
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
  });
});

describe("currentWeekStart", () => {
  // 2026-08-09 is a Sunday, 2026-08-03 the Monday before it.
  it("returns the Monday of the current week for a Sunday", () => {
    expect(currentWeekStart(new Date("2026-08-09T10:00:00Z"))).toBe("2026-08-03");
  });

  it("returns the same date when given a Monday", () => {
    expect(currentWeekStart(new Date("2026-08-10T10:00:00Z"))).toBe("2026-08-10");
  });

  it("agrees with isoWeekKey on which week a date falls in", () => {
    const weekStart = currentWeekStart(new Date("2026-08-09T10:00:00Z"));
    expect(isoWeekKey(weekStart)).toBe(isoWeekKey("2026-08-09"));
  });
});

describe("isSundayInTimeZone", () => {
  it("is true on a Sunday", () => {
    expect(isSundayInTimeZone(new Date("2026-08-09T10:00:00Z"))).toBe(true);
  });

  it("is false on a non-Sunday", () => {
    expect(isSundayInTimeZone(new Date("2026-08-10T10:00:00Z"))).toBe(false);
  });

  it("resolves to the user's time zone, not UTC, near a day boundary", () => {
    // 2026-08-08T23:30:00Z (Saturday UTC) is already Sunday in Asia/Kuching (UTC+8).
    expect(isSundayInTimeZone(new Date("2026-08-08T23:30:00Z"))).toBe(true);
  });
});

describe("formatRelativeDay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function daysAgo(days: number): number {
    return new Date("2026-07-27T12:00:00Z").getTime() - days * 86400000;
  }

  it("says Today for the same day", () => {
    expect(formatRelativeDay(daysAgo(0))).toBe("Today");
  });

  it("says Yesterday for one day back", () => {
    expect(formatRelativeDay(daysAgo(1))).toBe("Yesterday");
  });

  it("says N days ago under a month", () => {
    expect(formatRelativeDay(daysAgo(5))).toBe("5 days ago");
  });

  it("says N months ago under a year", () => {
    expect(formatRelativeDay(daysAgo(65))).toBe("2 months ago");
  });

  it("says N years ago at a year or more", () => {
    expect(formatRelativeDay(daysAgo(400))).toBe("1 year ago");
  });
});
