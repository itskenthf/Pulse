import type { SpotifyArtist, SpotifyTrack } from "@pulse/adapter-spotify";

export type SpotifyData =
  | { connected: false }
  | {
      connected: true;
      tracks: SpotifyTrack[];
      topArtist: SpotifyArtist | null;
      topGenre: string | null;
      fetchedAt: string;
    };
