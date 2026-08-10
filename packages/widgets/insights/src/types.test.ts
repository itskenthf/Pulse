import { describe, expect, it } from "vitest";
import { insightsDataSchema } from "./types";

describe("insightsDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(
      insightsDataSchema.safeParse({
        insights: ["You've lost 1kg this month."],
        fetchedAt: "2026-08-09T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("accepts an empty insights list", () => {
    expect(insightsDataSchema.safeParse({ insights: [], fetchedAt: "2026-08-09T00:00:00Z" }).success).toBe(
      true,
    );
  });

  it("rejects a row missing fetchedAt", () => {
    expect(insightsDataSchema.safeParse({ insights: [] }).success).toBe(false);
  });
});
