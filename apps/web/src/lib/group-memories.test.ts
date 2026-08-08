import { describe, expect, it } from "vitest";
import { groupMemoriesByRecency } from "./group-memories";
import type { Memory } from "@pulse/database";

function memory(createdAt: string, id = createdAt): Memory {
  return {
    id,
    source: "test",
    title: `Memory at ${createdAt}`,
    description: null,
    metadata: {},
    createdAt,
  };
}

describe("groupMemoriesByRecency", () => {
  it("buckets an entry as Yesterday when it's under 24 raw elapsed hours but a different local calendar day", () => {
    // now = 2026-08-09 08:30 in Asia/Kuching (today locally is the 9th).
    // The memory is only 9.5 raw hours earlier, which a naive
    // elapsed-hours check would call "Today" — but its local time is
    // 2026-08-08 23:00, the previous calendar day.
    const now = new Date("2026-08-09T00:30:00Z");
    const groups = groupMemoriesByRecency([memory("2026-08-08T15:00:00Z")], now);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe("Yesterday");
  });

  it("buckets an entry from the previous UTC calendar day as Today when it's already today locally", () => {
    // 2026-08-08T17:00:00Z is 2026-08-09 01:00 in Asia/Kuching — "today"
    // locally even though the UTC date is still the 8th. A raw
    // elapsed-hours or UTC-date comparison would get this wrong.
    const now = new Date("2026-08-08T18:00:00Z"); // 2026-08-09 02:00 in Asia/Kuching
    const groups = groupMemoriesByRecency([memory("2026-08-08T17:00:00Z")], now);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe("Today");
  });

  it("buckets same-calendar-day entries as Today regardless of time of day", () => {
    const now = new Date("2026-08-08T10:00:00Z"); // 2026-08-08 18:00 in Asia/Kuching
    const groups = groupMemoriesByRecency([memory("2026-08-08T00:30:00Z")], now); // 2026-08-08 08:30 local
    expect(groups[0]!.label).toBe("Today");
  });

  it("labels older entries by month and year", () => {
    const now = new Date("2026-08-08T10:00:00Z");
    const groups = groupMemoriesByRecency([memory("2026-06-01T10:00:00Z")], now);
    expect(groups[0]!.label).toBe("June 2026");
  });

  it("groups Last Week entries together", () => {
    const now = new Date("2026-08-08T10:00:00Z");
    const groups = groupMemoriesByRecency([memory("2026-08-03T10:00:00Z")], now);
    expect(groups[0]!.label).toBe("Last Week");
  });
});
