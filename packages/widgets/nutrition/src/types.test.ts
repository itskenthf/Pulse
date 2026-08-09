import { describe, expect, it } from "vitest";
import { nutritionDataSchema } from "./types";

const validData = {
  today: { loggedOn: "2026-08-09", calories: 1200, proteinG: 60, waterMl: 750, milkMl: 200 },
  goals: [
    { id: "g1", title: "Drink milk daily", metric: "milk_ml" as const, targetValue: 500, comparator: "at_least" as const },
  ],
  history: [{ loggedOn: "2026-08-08", calories: 1800 }],
  fetchedAt: "2026-08-09T00:00:00Z",
};

describe("nutritionDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(nutritionDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts an empty goals list", () => {
    expect(nutritionDataSchema.safeParse({ ...validData, goals: [] }).success).toBe(true);
  });

  it("accepts an empty history list", () => {
    expect(nutritionDataSchema.safeParse({ ...validData, history: [] }).success).toBe(true);
  });

  it("rejects a cache row written before the history field existed", () => {
    // A widget data contract changing across a deploy is expected to
    // surface as a parse failure (see Widget.dataSchema's doc comment in
    // @pulse/sdk) — refresh-widget.ts's own resilience to this failure
    // (not this schema) is what makes such a row self-heal on the next
    // refresh; see refresh-widget.test.ts.
    const { history: _history, ...withoutHistory } = validData;
    expect(nutritionDataSchema.safeParse(withoutHistory).success).toBe(false);
  });

  it("rejects a row missing a required field", () => {
    const { fetchedAt: _fetchedAt, ...withoutFetchedAt } = validData;
    expect(nutritionDataSchema.safeParse(withoutFetchedAt).success).toBe(false);
  });

  it("rejects a negative counter", () => {
    const result = nutritionDataSchema.safeParse({
      ...validData,
      today: { ...validData.today, calories: -5 },
    });
    expect(result.success).toBe(false);
  });
});
