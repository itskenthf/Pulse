import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatHours, formatRelativeDay } from "./format";

describe("formatHours", () => {
  it("shows minutes under an hour", () => {
    expect(formatHours(45)).toBe("45m");
  });

  it("shows a whole hour without a trailing .0", () => {
    expect(formatHours(120)).toBe("2h");
  });

  it("shows a fractional hour", () => {
    expect(formatHours(90)).toBe("1.5h");
  });

  it("treats exactly 60 minutes as an hour, not minutes", () => {
    expect(formatHours(60)).toBe("1h");
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
    return Math.floor(new Date("2026-07-27T12:00:00Z").getTime() / 1000) - days * 86400;
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
