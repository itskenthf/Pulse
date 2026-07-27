import { describe, expect, it } from "vitest";
import { deriveSteamMemories } from "./derive-memories";
import type { SteamData, SteamGame } from "./types";

function game(overrides: Partial<SteamGame> = {}): SteamGame {
  return {
    appId: 1,
    name: "Palworld",
    iconUrl: "",
    playtime2WeeksMinutes: 0,
    playtimeForeverMinutes: 0,
    achievements: null,
    ...overrides,
  };
}

function data(games: SteamGame[]): SteamData {
  return { games, fetchedAt: "2026-07-27T00:00:00Z" };
}

describe("deriveSteamMemories", () => {
  it("returns nothing for an empty games list", () => {
    expect(deriveSteamMemories(null, data([]))).toEqual([]);
  });

  it("emits a memory for a newly-appearing game", () => {
    expect(deriveSteamMemories(null, data([game({ name: "Palworld" })]))).toEqual([
      { title: "Started playing Palworld" },
    ]);
  });

  it("emits a memory when playtime increases by 15+ minutes", () => {
    const previous = data([game({ appId: 1, playtimeForeverMinutes: 60 })]);
    const next = data([game({ appId: 1, playtimeForeverMinutes: 100 })]);

    expect(deriveSteamMemories(previous, next)).toEqual([
      { title: "Played Palworld", description: "40m this session" },
    ]);
  });

  it("formats sessions over an hour in hours", () => {
    const previous = data([game({ appId: 1, playtimeForeverMinutes: 0 })]);
    const next = data([game({ appId: 1, playtimeForeverMinutes: 150 })]);

    expect(deriveSteamMemories(previous, next)).toEqual([
      { title: "Played Palworld", description: "2.5h this session" },
    ]);
  });

  it("ignores playtime drift under the 15-minute threshold", () => {
    const previous = data([game({ appId: 1, playtimeForeverMinutes: 100 })]);
    const next = data([game({ appId: 1, playtimeForeverMinutes: 105 })]);

    expect(deriveSteamMemories(previous, next)).toEqual([]);
  });

  it("does not emit a memory for a game that dropped out of the list", () => {
    const previous = data([game({ appId: 1, name: "Palworld" })]);
    const next = data([]);

    expect(deriveSteamMemories(previous, next)).toEqual([]);
  });
});
