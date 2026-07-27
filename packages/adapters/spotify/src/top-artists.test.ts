import { describe, expect, it } from "vitest";
import { deriveTopGenre, type SpotifyArtist } from "./top-artists";

function artist(id: string, genres: string[]): SpotifyArtist {
  return { id, name: id, genres, imageUrl: null, url: "" };
}

describe("deriveTopGenre", () => {
  it("returns null for an empty artist list", () => {
    expect(deriveTopGenre([])).toBeNull();
  });

  it("returns the only genre when there's a single artist", () => {
    expect(deriveTopGenre([artist("a1", ["indie"])])).toBe("indie");
  });

  it("picks the most frequent genre across artists", () => {
    const artists = [artist("a1", ["indie", "pop"]), artist("a2", ["indie"]), artist("a3", ["rock"])];
    expect(deriveTopGenre(artists)).toBe("indie");
  });

  it("breaks ties in favor of the higher-ranked artist's genre", () => {
    // "pop" and "rock" both appear once — a1 (rank 1) has "pop", so ties
    // go to it rather than being sorted some other way.
    const artists = [artist("a1", ["pop"]), artist("a2", ["rock"])];
    expect(deriveTopGenre(artists)).toBe("pop");
  });

  it("returns null when no artist has any genre data", () => {
    expect(deriveTopGenre([artist("a1", []), artist("a2", [])])).toBeNull();
  });
});
