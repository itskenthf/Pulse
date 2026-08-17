import { describe, expect, it } from "vitest";
import { deriveMealsMemories } from "./derive-memories";
import type { MealsData, MealsToday } from "./types";

function today(overrides: Partial<MealsToday> = {}): MealsToday {
  return {
    loggedOn: "2026-08-17",
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
    ...overrides,
  };
}

function data(overrides: Partial<MealsToday> = {}): MealsData {
  return { today: today(overrides), fetchedAt: "2026-08-17T00:00:00Z" };
}

describe("deriveMealsMemories", () => {
  it("returns nothing on the very first fetch (no previous snapshot)", () => {
    expect(deriveMealsMemories(null, data({ breakfast: true }))).toEqual([]);
  });

  it("emits a memory when a meal flips from unchecked to checked", () => {
    const previous = data({ breakfast: false });
    const next = data({ breakfast: true });

    expect(deriveMealsMemories(previous, next)).toEqual([{ title: "Checked off breakfast" }]);
  });

  it("does not emit a memory when a meal is already checked", () => {
    const snapshot = data({ lunch: true });

    expect(deriveMealsMemories(snapshot, snapshot)).toEqual([]);
  });

  it("emits one memory per meal checked off in a single refresh", () => {
    const previous = data({ breakfast: false, lunch: false });
    const next = data({ breakfast: true, lunch: true });

    expect(deriveMealsMemories(previous, next)).toEqual([
      { title: "Checked off breakfast" },
      { title: "Checked off lunch" },
    ]);
  });

  it("does not emit a memory when the day rolls over, even though checks reset to unchecked", () => {
    const previous = data({ loggedOn: "2026-08-16", breakfast: true });
    const next = data({ loggedOn: "2026-08-17", breakfast: false });

    expect(deriveMealsMemories(previous, next)).toEqual([]);
  });
});
