import { describe, expect, it } from "vitest";
import { dailyDigestDataSchema } from "./types";

describe("dailyDigestDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(
      dailyDigestDataSchema.safeParse({
        entries: [{ source: "GitHub", count: 3, titles: ["Opened PR #42", "Merged PR #40"] }],
        fetchedAt: "2026-08-09T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("accepts an empty entries list (nothing logged today)", () => {
    expect(dailyDigestDataSchema.safeParse({ entries: [], fetchedAt: "2026-08-09T00:00:00Z" }).success).toBe(
      true,
    );
  });

  it("rejects an entry with a non-positive count", () => {
    const result = dailyDigestDataSchema.safeParse({
      entries: [{ source: "GitHub", count: 0, titles: [] }],
      fetchedAt: "2026-08-09T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a row missing fetchedAt", () => {
    expect(dailyDigestDataSchema.safeParse({ entries: [] }).success).toBe(false);
  });
});
