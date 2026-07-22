import { fetchRecentlyPlayed } from "@pulse/adapter-steam";
import { ensureWidgetRegistered, readWidgetSettings } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { MAX_GAMES, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { SteamData, SteamSettings } from "./types";

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

  const games = await fetchRecentlyPlayed(apiKey, settings.steamId64);
  games.sort((a, b) => b.playtime2WeeksMinutes - a.playtime2WeeksMinutes);

  return {
    games: games.slice(0, MAX_GAMES),
    fetchedAt: new Date().toISOString(),
  };
}
