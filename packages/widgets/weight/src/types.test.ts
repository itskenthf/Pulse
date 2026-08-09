import { describe, expect, it } from "vitest";
import { weightDataSchema } from "./types";

const validData = {
  logs: [
    {
      id: "w1",
      weightKg: 62.4,
      loggedOn: "2026-08-09",
      note: null,
      createdAt: "2026-08-09T00:00:00Z",
      updatedAt: "2026-08-09T00:00:00Z",
    },
  ],
  goal: {
    id: "g1",
    title: "Reach 45kg",
    targetValue: 45,
    comparator: "at_most" as const,
  },
  fetchedAt: "2026-08-09T00:00:00Z",
};

describe("weightDataSchema", () => {
  it("accepts a well-formed cache row with a goal", () => {
    expect(weightDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts a null goal and an empty log list", () => {
    expect(
      weightDataSchema.safeParse({ logs: [], goal: null, fetchedAt: validData.fetchedAt }).success,
    ).toBe(true);
  });

  it("rejects a row missing a required field", () => {
    const { fetchedAt: _fetchedAt, ...withoutFetchedAt } = validData;
    expect(weightDataSchema.safeParse(withoutFetchedAt).success).toBe(false);
  });

  it("rejects a log where a field's type has drifted", () => {
    const result = weightDataSchema.safeParse({
      ...validData,
      logs: [{ ...validData.logs[0], weightKg: "62.4" }],
    });
    expect(result.success).toBe(false);
  });
});
