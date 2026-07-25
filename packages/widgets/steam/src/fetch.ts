import {
  fetchAchievementSummary,
  fetchLastPlayedMap,
  fetchRecentlyPlayed,
} from "@pulse/adapter-steam";
import { ensureWidgetRegistered, readWidgetSettings } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { MAX_GAMES, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { SteamData, SteamGame, SteamSettings } from "./types";

export async function fetchSteamData(context: WidgetFetchContext): Promise<SteamData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error("STEAM_API_KEY is not configured");
  }

  const settings = await readWidgetSettings<SteamSettings>(context.userId, WIDGET_ID);
  if (!settings?.steamId64) {
    throw new Error("Set your SteamID64 in the widget settings first");
  }

  const recentGames = await fetchRecentlyPlayed(apiKey, settings.steamId64);
  recentGames.sort((a, b) => b.playtime2WeeksMinutes - a.playtime2WeeksMinutes);
  const topGames = recentGames.slice(0, MAX_GAMES);

  // Only 2 games shown now, so a per-game achievements call is cheap;
  // last-played is one call for the whole library, not per game.
  const [lastPlayedMap, achievementsList] = await Promise.all([
    fetchLastPlayedMap(apiKey, settings.steamId64),
    Promise.all(
      topGames.map((game) => fetchAchievementSummary(apiKey, settings.steamId64, game.appId)),
    ),
  ]);

  const games: SteamGame[] = topGames.map((game, index) => ({
    ...game,
    lastPlayedAt: lastPlayedMap[game.appId],
    achievements: achievementsList[index] ?? null,
  }));

  return {
    games,
    fetchedAt: new Date().toISOString(),
  };
}
