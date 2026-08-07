import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function minutesAgo(minutes: number): string {
    return new Date(new Date("2026-07-27T12:00:00Z").getTime() - minutes * 60_000).toISOString();
  }

  it("says Just now for under a minute", () => {
    expect(formatRelativeTime(minutesAgo(0))).toBe("Just now");
  });

  it("says N minutes ago under an hour", () => {
    expect(formatRelativeTime(minutesAgo(45))).toBe("45m ago");
  });

  it("says N hours ago under a day", () => {
    expect(formatRelativeTime(minutesAgo(5 * 60))).toBe("5h ago");
  });

  it("says N days ago under a month", () => {
    expect(formatRelativeTime(minutesAgo(3 * 24 * 60))).toBe("3d ago");
  });

  it("says N months ago under a year", () => {
    expect(formatRelativeTime(minutesAgo(65 * 24 * 60))).toBe("2mo ago");
  });

  it("says N years ago at a year or more", () => {
    expect(formatRelativeTime(minutesAgo(400 * 24 * 60))).toBe("1y ago");
  });

  it("returns an empty string for an unparseable date", () => {
    expect(formatRelativeTime("not-a-date")).toBe("");
  });
});
