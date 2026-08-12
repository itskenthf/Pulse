import { fetchWithRetry } from "@pulse/http";

export interface RecentlyPlayedGame {
  appId: number;
  name: string;
  iconUrl: string;
  playtime2WeeksMinutes: number;
  playtimeForeverMinutes: number;
}

export interface AchievementSummary {
  unlocked: number;
  total: number;
  /** Display name of the first locked achievement, in the order Steam
   *  returns them (schema-declared order) — undefined once everything is
   *  unlocked, or if Steam didn't return a display name for it. */
  nextAchievementName?: string;
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
  signal?: AbortSignal,
): Promise<RecentlyPlayedGame[]> {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("format", "json");

  const response = await fetchWithRetry(url, { cache: "no-store", signal });
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

interface OwnedGamesApiResponse {
  response?: {
    games?: { appid?: number; rtime_last_played?: number }[];
  };
}

/**
 * Maps appId -> last-played unix timestamp (seconds), via GetOwnedGames.
 * One call for the whole library rather than one per game — the recently-
 * played list is already narrow, so this just annotates it with a real
 * "last played" date instead of only the 2-week/forever playtime figures.
 */
export async function fetchLastPlayedMap(
  apiKey: string,
  steamId64: string,
  signal?: AbortSignal,
): Promise<Record<number, number>> {
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("include_appinfo", "0");
  url.searchParams.set("format", "json");

  const response = await fetchWithRetry(url, { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Steam API request failed: ${response.status}`);
  }

  const body = (await response.json()) as OwnedGamesApiResponse;
  const games = body.response?.games ?? [];

  const map: Record<number, number> = {};
  for (const game of games) {
    if (typeof game.appid === "number" && typeof game.rtime_last_played === "number") {
      map[game.appid] = game.rtime_last_played;
    }
  }
  return map;
}

interface AppDetailsApiResponse {
  [appId: string]: {
    success?: boolean;
    data?: {
      header_image?: string;
      capsule_image?: string;
    };
  };
}

/**
 * Steam's public store metadata endpoint (no API key needed — it's the
 * same data the store page itself reads). Used only for the real,
 * currently-valid cover art URL: the two guessable CDN conventions
 * (`header.jpg`, `capsule_616x353.jpg` — see @pulse/widget-steam's
 * CoverArt) don't exist for every app, especially ones onboarded under
 * Steam's newer asset pipeline, so guessing silently shows "No cover
 * art" for a game that has real art, just not at that path. Returns
 * null (not a thrown error) on any failure — cover art is decorative,
 * not worth failing the whole widget refresh over.
 */
export async function fetchAppCoverArtUrl(
  appId: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", String(appId));
    url.searchParams.set("filters", "basic");

    const response = await fetchWithRetry(url, { cache: "no-store", signal });
    if (!response.ok) return null;

    const body = (await response.json()) as AppDetailsApiResponse;
    const entry = body[String(appId)];
    if (!entry?.success) return null;

    return entry.data?.header_image ?? entry.data?.capsule_image ?? null;
  } catch (err) {
    console.error(`Steam appdetails fetch failed for appId ${appId}:`, err);
    return null;
  }
}

interface PlayerAchievementsApiResponse {
  playerstats?: {
    success?: boolean;
    achievements?: { achieved?: number; name?: string }[];
  };
}

/**
 * Per-game achievement completion. Returns null (not a thrown error) when
 * the game has no achievements or the data isn't available — a common,
 * expected case (most games don't support Steam achievements at all),
 * not a failure the widget should surface as an error.
 *
 * `l10n_lang=english` makes Steam include each achievement's display
 * `name` in the response — otherwise only `apiname`/`achieved` come
 * back. Steam has no canonical "recommended next" ordering, so
 * "next achievement" here is simply the first locked one in the order
 * Steam returns them (schema-declared order), not a separate call to
 * GetSchemaForGame.
 */
export async function fetchAchievementSummary(
  apiKey: string,
  steamId64: string,
  appId: number,
  signal?: AbortSignal,
): Promise<AchievementSummary | null> {
  const url = new URL("https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId64);
  url.searchParams.set("appid", String(appId));
  url.searchParams.set("l10n_lang", "english");
  url.searchParams.set("format", "json");

  const response = await fetchWithRetry(url, { cache: "no-store", signal });
  if (!response.ok) {
    // Steam specifically returns 400 for "this game has no stats" — the
    // one non-ok status that's a real, expected non-error case. Anything
    // else (429 rate-limited, 5xx outage, 401/403 auth trouble) is a
    // genuine failure and must throw rather than silently collapsing
    // into the same "no achievements" result — that previously made a
    // transient Steam outage indistinguishable from "this game just
    // doesn't support achievements," and got cached as such for up to
    // this widget's full refreshInterval.
    if (response.status === 400) {
      return null;
    }
    throw new Error(`Steam achievements request failed: ${response.status}`);
  }

  const body = (await response.json()) as PlayerAchievementsApiResponse;
  const achievements = body.playerstats?.achievements;
  if (!body.playerstats?.success || !achievements || achievements.length === 0) {
    return null;
  }

  const nextLocked = achievements.find((a) => a.achieved !== 1);

  return {
    unlocked: achievements.filter((a) => a.achieved === 1).length,
    total: achievements.length,
    nextAchievementName: nextLocked?.name,
  };
}
