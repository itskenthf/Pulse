import type { RecentlyPlayedGame } from "@pulse/adapter-steam";

export interface SteamSettings {
  /** 17-digit SteamID64. Not a secret — identifies the public profile to read. */
  steamId64: string;
}

export interface SteamData {
  games: RecentlyPlayedGame[];
  fetchedAt: string;
}
