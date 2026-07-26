import {
  deriveTopGenre,
  fetchTopArtists,
  fetchTopTracks,
  refreshAccessToken,
} from "@pulse/adapter-spotify";
import {
  ensureWidgetRegistered,
  readProviderAccount,
  updateProviderAccountTokenIfCurrent,
} from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import {
  ARTIST_LIMIT,
  PROVIDER,
  TRACK_LIMIT,
  WIDGET_DESCRIPTION,
  WIDGET_ID,
  WIDGET_NAME,
} from "./constants";
import type { SpotifyData } from "./types";

const EXPIRY_SAFETY_MARGIN_SECONDS = 60;

export async function fetchSpotifyData(
  context: WidgetFetchContext,
): Promise<SpotifyData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const account = await readProviderAccount(context.userId, PROVIDER);
  if (!account?.accessToken) {
    return { connected: false };
  }

  let accessToken = account.accessToken;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired =
    account.expiresAt === null ||
    account.expiresAt <= nowSeconds + EXPIRY_SAFETY_MARGIN_SECONDS;

  if (isExpired) {
    if (!account.refreshToken) {
      // No way to refresh — the user needs to reconnect via the widget's
      // "Connect Spotify" state.
      return { connected: false };
    }

    const clientId = process.env.AUTH_SPOTIFY_ID;
    const clientSecret = process.env.AUTH_SPOTIFY_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("AUTH_SPOTIFY_ID/AUTH_SPOTIFY_SECRET are not configured");
    }

    let refreshed;
    try {
      refreshed = await refreshAccessToken({
        refreshToken: account.refreshToken,
        clientId,
        clientSecret,
      });
    } catch {
      // Most commonly a revoked/invalid refresh token (e.g. the user
      // disconnected Spotify's access from their own account settings) —
      // treat it the same as "never connected" so the widget prompts to
      // reconnect instead of showing a generic error.
      return { connected: false };
    }
    accessToken = refreshed.accessToken;

    // Guarded write, not a blind upsert: the cron scheduler and a manual
    // "Refresh all" can both land here for the same user within moments
    // of each other, both having read the same expired token. Only the
    // first write whose expected refresh token still matches applies —
    // the loser re-reads instead of clobbering the winner's fresher
    // result (see updateProviderAccountTokenIfCurrent's doc comment).
    const applied = await updateProviderAccountTokenIfCurrent(
      context.userId,
      PROVIDER,
      account.refreshToken,
      {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      },
    );

    if (!applied) {
      const current = await readProviderAccount(context.userId, PROVIDER);
      const nowAfterRefresh = Math.floor(Date.now() / 1000);
      if (current?.accessToken && current.expiresAt && current.expiresAt > nowAfterRefresh) {
        accessToken = current.accessToken;
      }
    }
  }

  const [tracks, artists] = await Promise.all([
    fetchTopTracks(accessToken, TRACK_LIMIT),
    fetchTopArtists(accessToken, ARTIST_LIMIT),
  ]);

  return {
    connected: true,
    tracks,
    topArtist: artists[0] ?? null,
    topGenre: deriveTopGenre(artists),
    fetchedAt: new Date().toISOString(),
  };
}
