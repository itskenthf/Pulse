import { describe, expect, it } from "vitest";
import { mealsDataSchema } from "./types";

const validData = {
  today: { loggedOn: "2026-08-09", breakfast: true, lunch: false, dinner: false, snack: false },
  fetchedAt: "2026-08-09T00:00:00Z",
};

describe("mealsDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(mealsDataSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects a row missing a required field", () => {
    const { fetchedAt: _fetchedAt, ...withoutFetchedAt } = validData;
    expect(mealsDataSchema.safeParse(withoutFetchedAt).success).toBe(false);
  });

  it("rejects a today value where a field's type has drifted", () => {
    const result = mealsDataSchema.safeParse({
      ...validData,
      today: { ...validData.today, breakfast: "true" },
    });
    expect(result.success).toBe(false);
  });
});
