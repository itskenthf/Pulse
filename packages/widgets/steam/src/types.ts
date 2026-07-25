import type { AchievementSummary, RecentlyPlayedGame } from "@pulse/adapter-steam";

export interface SteamSettings {
  /** 17-digit SteamID64. Not a secret — identifies the public profile to read. */
  steamId64: string;
}

export interface SteamGame extends RecentlyPlayedGame {
  /** Unix seconds, from GetOwnedGames — undefined if unavailable. */
  lastPlayedAt?: number;
  /** null (not undefined) means "checked, this game has no achievements
   *  or the data isn't available" — distinct from "not yet fetched". */
  achievements: AchievementSummary | null;
}

export interface SteamData {
  games: SteamGame[];
  fetchedAt: string;
}
