import { describe, expect, it } from "vitest";
import { steamDataSchema } from "./types";

const validGame = {
  appId: 440,
  name: "Team Fortress 2",
  iconUrl: "https://example.com/icon.jpg",
  playtime2WeeksMinutes: 120,
  playtimeForeverMinutes: 6000,
  achievements: { unlocked: 10, total: 50, nextAchievementName: "Sniper" },
};

describe("steamDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    const result = steamDataSchema.safeParse({
      games: [validGame],
      fetchedAt: "2026-07-27T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a game with null achievements and no lastPlayedAt (both legitimately absent)", () => {
    const { achievements: _achievements, ...gameWithoutAchievements } = validGame;
    const result = steamDataSchema.safeParse({
      games: [{ ...gameWithoutAchievements, achievements: null }],
      fetchedAt: "2026-07-27T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a game missing a required field", () => {
    const { name: _name, ...withoutName } = validGame;
    const result = steamDataSchema.safeParse({
      games: [withoutName],
      fetchedAt: "2026-07-27T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects achievements that isn't null or a real summary (e.g. a leftover empty object)", () => {
    const result = steamDataSchema.safeParse({
      games: [{ ...validGame, achievements: {} }],
      fetchedAt: "2026-07-27T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});
