import { describe, expect, it } from "vitest";
import { isoWeekKey, todayInTimeZone } from "./date";

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
