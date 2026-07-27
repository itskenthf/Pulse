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

  const recentGames = await fetchRecentlyPlayed(apiKey, settings.steamId64, context.signal);
  recentGames.sort((a, b) => b.playtime2WeeksMinutes - a.playtime2WeeksMinutes);
  const topGames = recentGames.slice(0, MAX_GAMES);

  // Only 2 games shown now, so a per-game achievements call is cheap;
  // last-played is one call for the whole library, not per game.
  //
  // Both fetchLastPlayedMap and fetchAchievementSummary can throw on a
  // real failure (rate-limited, Steam outage) — good for not silently
  // mislabeling a transient problem as permanent data, but it means
  // neither one's failure should fail the whole widget refresh, since
  // that would also discard the already-successful recently-played
  // games list fetched above. Both are caught individually so a
  // transient failure only drops that one piece (last-played dates, or
  // one game's achievements), logged so it's distinguishable from a
  // real "no data" case in server logs. fetchRecentlyPlayed itself
  // (above) is deliberately NOT caught the same way — without a base
  // games list there's nothing left to show regardless, so letting that
  // one propagate as a real widget-level error is the honest behavior,
  // not something to paper over with a fake empty result.
  const [lastPlayedMap, achievementsList] = await Promise.all([
    fetchLastPlayedMap(apiKey, settings.steamId64, context.signal).catch((err) => {
      console.error("Steam last-played fetch failed:", err);
      return {} as Record<number, number>;
    }),
    Promise.all(
      topGames.map((game) =>
        fetchAchievementSummary(apiKey, settings.steamId64, game.appId, context.signal).catch(
          (err) => {
            console.error(`Steam achievements fetch failed for appId ${game.appId}:`, err);
            return null;
          },
        ),
      ),
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
