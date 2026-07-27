import { describe, expect, it } from "vitest";
import { spotifyDataSchema } from "./types";

describe("spotifyDataSchema", () => {
  it("accepts the not-connected state", () => {
    expect(spotifyDataSchema.safeParse({ connected: false }).success).toBe(true);
  });

  it("accepts a well-formed connected state", () => {
    const result = spotifyDataSchema.safeParse({
      connected: true,
      tracks: [
        {
          id: "1",
          name: "Song",
          artist: "Artist",
          imageUrl: null,
          url: "https://open.spotify.com/track/1",
        },
      ],
      topArtist: {
        id: "a1",
        name: "Artist",
        genres: ["indie"],
        imageUrl: null,
        url: "https://open.spotify.com/artist/a1",
      },
      topGenre: "indie",
      fetchedAt: "2026-07-27T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects connected:true missing its required fields", () => {
    const result = spotifyDataSchema.safeParse({ connected: true });
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized connected value", () => {
    const result = spotifyDataSchema.safeParse({ connected: "maybe" });
    expect(result.success).toBe(false);
  });
});
