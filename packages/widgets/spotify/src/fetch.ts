import { fetchTopTracks, refreshAccessToken } from "@pulse/adapter-spotify";
import { ensureWidgetRegistered, readProviderAccount, upsertProviderAccount } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { PROVIDER, TRACK_LIMIT, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { SpotifyData } from "./types";

const EXPIRY_SAFETY_MARGIN_SECONDS = 60;

export async function fetchSpotifyData(context: WidgetFetchContext): Promise<SpotifyData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const account = await readProviderAccount(context.userId, PROVIDER);
  if (!account?.accessToken) {
    return { connected: false };
  }

  let accessToken = account.accessToken;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired =
    account.expiresAt === null || account.expiresAt <= nowSeconds + EXPIRY_SAFETY_MARGIN_SECONDS;

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

    const refreshed = await refreshAccessToken({
      refreshToken: account.refreshToken,
      clientId,
      clientSecret,
    });
    accessToken = refreshed.accessToken;

    await upsertProviderAccount(context.userId, PROVIDER, {
      providerAccountId: account.providerAccountId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    });
  }

  const tracks = await fetchTopTracks(accessToken, TRACK_LIMIT);

  return { connected: true, tracks, fetchedAt: new Date().toISOString() };
}
