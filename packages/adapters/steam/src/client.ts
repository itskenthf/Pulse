export interface RecentlyPlayedGame {
  appId: number;
  name: string;
  iconUrl: string;
  playtime2WeeksMinutes: number;
  playtimeForeverMinutes: number;
}

interface SteamApiGame {
  appid?: number;
  name?: string;
  img_icon_url?: string;
  playtime_2weeks?: number;
  playtime_forever?: number;
}

interface SteamApiResponse {
  response?: {
    total_count?: number;
    games?: SteamApiGame[];
  };
}

function iconUrl(appId: number, iconHash: string): string {
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`;
}

/**
 * Steam's GetRecentlyPlayedGames: games played in the last 2 weeks. An
 * empty list is ambiguous — it can mean "no games played" OR "the
 * profile's Game Details privacy isn't Public" — Steam returns the same
 * empty response for both, with no error. The widget's empty state
 * mentions this.
 */
export async function fetchRecentlyPlayed(
  apiKey: string,
  steamId64: string,
): Promise<RecentlyPlayedGame[]> {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("format", "json");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Steam API request failed: ${response.status}`);
  }

  const body = (await response.json()) as SteamApiResponse;
  const games = body.response?.games ?? [];

  return games
    .filter(
      (game): game is SteamApiGame & { appid: number; name: string } =>
        typeof game.appid === "number" && typeof game.name === "string",
    )
    .map((game) => ({
      appId: game.appid,
      name: game.name,
      iconUrl: game.img_icon_url ? iconUrl(game.appid, game.img_icon_url) : "",
      playtime2WeeksMinutes: game.playtime_2weeks ?? 0,
      playtimeForeverMinutes: game.playtime_forever ?? 0,
    }));
}
