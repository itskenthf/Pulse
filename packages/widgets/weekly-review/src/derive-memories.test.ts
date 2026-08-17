import { describe, expect, it } from "vitest";
import { deriveWeeklyReviewMemories } from "./derive-memories";
import type { WeeklyReviewData, WeeklyReviewEntry } from "./types";

function review(overrides: Partial<WeeklyReviewEntry> = {}): WeeklyReviewEntry {
  return {
    id: "r1",
    weekOf: "2026-08-16",
    biggestAchievement: null,
    biggestStruggle: null,
    mood: null,
    energy: null,
    confidence: null,
    sleepQuality: null,
    notes: null,
    createdAt: "2026-08-16T00:00:00Z",
    updatedAt: "2026-08-16T00:00:00Z",
    ...overrides,
  };
}

function data(overrides: Partial<WeeklyReviewData> = {}): WeeklyReviewData {
  return {
    weekOf: "2026-08-16",
    review: null,
    weightKg: null,
    isSunday: true,
    fetchedAt: "2026-08-16T00:00:00Z",
    ...overrides,
  };
}

describe("deriveWeeklyReviewMemories", () => {
  it("returns nothing when no review has been saved", () => {
    expect(deriveWeeklyReviewMemories(null, data({ review: null }))).toEqual([]);
  });

  it("emits a memory the first time a review is saved for the week", () => {
    const previous = data({ review: null });
    const next = data({ review: review() });

    expect(deriveWeeklyReviewMemories(previous, next)).toEqual([
      { title: "Completed your weekly review" },
    ]);
  });

  it("does not emit a memory when an already-reviewed week is re-saved", () => {
    const snapshot = data({ review: review() });

    expect(deriveWeeklyReviewMemories(snapshot, snapshot)).toEqual([]);
  });

  it("emits a memory again once a new week's review is first saved", () => {
    const previous = data({
      weekOf: "2026-08-09",
      review: review({ weekOf: "2026-08-09" }),
    });
    const next = data({
      weekOf: "2026-08-16",
      review: review({ weekOf: "2026-08-16" }),
    });

    expect(deriveWeeklyReviewMemories(previous, next)).toEqual([
      { title: "Completed your weekly review" },
    ]);
  });
});
