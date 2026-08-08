import { describe, expect, it } from "vitest";
import { coverArtUrlForAttempt } from "./cover-art";

describe("coverArtUrlForAttempt", () => {
  it("uses the real URL on the first attempt when available", () => {
    expect(coverArtUrlForAttempt(730, "https://example.com/real-art.jpg", 0)).toBe(
      "https://example.com/real-art.jpg",
    );
  });

  it("falls back to header.jpg on the second attempt when a real URL was tried first", () => {
    expect(coverArtUrlForAttempt(730, "https://example.com/real-art.jpg", 1)).toBe(
      "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
    );
  });

  it("falls back to the capsule on the third attempt when a real URL was tried first", () => {
    expect(coverArtUrlForAttempt(730, "https://example.com/real-art.jpg", 2)).toBe(
      "https://cdn.akamai.steamstatic.com/steam/apps/730/capsule_616x353.jpg",
    );
  });

  it("goes straight to header.jpg on the first attempt when there's no real URL", () => {
    expect(coverArtUrlForAttempt(730, null, 0)).toBe(
      "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
    );
  });

  it("falls back to the capsule on the second attempt when there's no real URL", () => {
    expect(coverArtUrlForAttempt(730, null, 1)).toBe(
      "https://cdn.akamai.steamstatic.com/steam/apps/730/capsule_616x353.jpg",
    );
  });
});
