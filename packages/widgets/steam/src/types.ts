import { z } from "zod";

export interface SteamSettings {
  /** 17-digit SteamID64. Not a secret — identifies the public profile to read. */
  steamId64: string;
}

const achievementSummarySchema = z.object({
  unlocked: z.number(),
  total: z.number(),
  nextAchievementName: z.string().optional(),
});

const steamGameSchema = z.object({
  appId: z.number(),
  name: z.string(),
  iconUrl: z.string(),
  playtime2WeeksMinutes: z.number(),
  playtimeForeverMinutes: z.number(),
  /** Unix seconds, from GetOwnedGames — undefined if unavailable. */
  lastPlayedAt: z.number().optional(),
  /** null (not undefined) means "checked, this game has no achievements
   *  or the data isn't available" — distinct from "not yet fetched". */
  achievements: achievementSummarySchema.nullable(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk).
 */
export const steamDataSchema = z.object({
  games: z.array(steamGameSchema),
  fetchedAt: z.string(),
});

export type SteamGame = z.infer<typeof steamGameSchema>;
export type SteamData = z.infer<typeof steamDataSchema>;
