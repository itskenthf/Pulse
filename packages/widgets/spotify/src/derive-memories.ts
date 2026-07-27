import type { MemoryEvent } from "@pulse/sdk";
import type { SpotifyData } from "./types";

/**
 * Only signal available worth logging today: the top artist changing.
 * Diffs against the previous snapshot — see the doc comment on
 * `Widget.deriveMemories` in @pulse/sdk for why this isn't logged on
 * every fetch.
 */
export function deriveSpotifyMemories(
  previous: SpotifyData | null,
  next: SpotifyData,
): MemoryEvent[] {
  if (!next.connected || !next.topArtist) return [];

  const previousTopArtistName = previous?.connected ? previous.topArtist?.name : undefined;
  if (next.topArtist.name === previousTopArtistName) return [];

  return [{ title: `Top artist is now ${next.topArtist.name}` }];
}
