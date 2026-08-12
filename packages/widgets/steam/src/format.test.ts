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

  // Day-bucketing behavior ("Today"/"Yesterday"/"N days/months/years ago")
  // is covered by @pulse/health's own formatRelativeDay tests — this just
  // confirms the Unix-seconds-to-epoch-ms conversion at this function's
  // boundary is correct.
  it("converts Unix seconds to the shared epoch-ms formatter", () => {
    const yesterday = Math.floor(new Date("2026-07-26T12:00:00Z").getTime() / 1000);
    expect(formatRelativeDay(yesterday)).toBe("Yesterday");
  });
});
