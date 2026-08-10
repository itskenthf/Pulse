import { describe, expect, it } from "vitest";
import { weeklyReviewDataSchema } from "./types";

const validData = {
  weekOf: "2026-08-03",
  review: {
    id: "r1",
    weekOf: "2026-08-03",
    biggestAchievement: "Shipped the health pillar",
    biggestStruggle: "Sleep",
    mood: 4,
    energy: 3,
    confidence: 5,
    sleepQuality: 2,
    notes: "Good week overall",
    createdAt: "2026-08-09T00:00:00Z",
    updatedAt: "2026-08-09T00:00:00Z",
  },
  weightKg: 62.4,
  isSunday: true,
  fetchedAt: "2026-08-09T00:00:00Z",
};

describe("weeklyReviewDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(weeklyReviewDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts a null review (nothing saved yet this week)", () => {
    expect(weeklyReviewDataSchema.safeParse({ ...validData, review: null }).success).toBe(true);
  });

  it("accepts a review with all optional fields null", () => {
    const blankReview = {
      ...validData.review,
      biggestAchievement: null,
      biggestStruggle: null,
      mood: null,
      energy: null,
      confidence: null,
      sleepQuality: null,
      notes: null,
    };
    expect(weeklyReviewDataSchema.safeParse({ ...validData, review: blankReview }).success).toBe(true);
  });

  it("rejects a rating outside 1-5", () => {
    const result = weeklyReviewDataSchema.safeParse({
      ...validData,
      review: { ...validData.review, mood: 6 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a row missing a required field", () => {
    const { fetchedAt: _fetchedAt, ...withoutFetchedAt } = validData;
    expect(weeklyReviewDataSchema.safeParse(withoutFetchedAt).success).toBe(false);
  });
});
