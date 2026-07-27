import { describe, expect, it } from "vitest";
import { deriveSpotifyMemories } from "./derive-memories";
import type { SpotifyData } from "./types";

function artist(name: string) {
  return { id: name, name, genres: [], imageUrl: null, url: "" };
}

const disconnected: SpotifyData = { connected: false };

type ConnectedSpotifyData = Extract<SpotifyData, { connected: true }>;

function connected(topArtist: ConnectedSpotifyData["topArtist"]): SpotifyData {
  return { connected: true, tracks: [], topArtist, topGenre: null, fetchedAt: "2026-07-27T00:00:00Z" };
}

describe("deriveSpotifyMemories", () => {
  it("returns nothing when not connected", () => {
    expect(deriveSpotifyMemories(null, disconnected)).toEqual([]);
  });

  it("returns nothing when there's no top artist", () => {
    expect(deriveSpotifyMemories(null, connected(null))).toEqual([]);
  });

  it("emits a memory when the top artist changes", () => {
    const previous = connected(artist("Old Artist"));
    const next = connected(artist("New Artist"));

    expect(deriveSpotifyMemories(previous, next)).toEqual([
      { title: "Top artist is now New Artist" },
    ]);
  });

  it("does not emit a memory when the top artist is unchanged", () => {
    const snapshot = connected(artist("Same Artist"));

    expect(deriveSpotifyMemories(snapshot, snapshot)).toEqual([]);
  });

  it("emits a memory the first time a top artist appears", () => {
    expect(deriveSpotifyMemories(null, connected(artist("First Artist")))).toEqual([
      { title: "Top artist is now First Artist" },
    ]);
  });

  it("treats a previously-disconnected state the same as no top artist", () => {
    expect(deriveSpotifyMemories(disconnected, connected(artist("New Artist")))).toEqual([
      { title: "Top artist is now New Artist" },
    ]);
  });
});
