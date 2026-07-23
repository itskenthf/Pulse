import type { SpotifyTrack } from "@pulse/adapter-spotify";

export type SpotifyData =
  | { connected: false }
  | { connected: true; tracks: SpotifyTrack[]; fetchedAt: string };
