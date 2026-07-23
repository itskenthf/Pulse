import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, fetchSpotifyProfileId } from "@pulse/adapter-spotify";
import { upsertProviderAccount } from "@pulse/database";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "spotify_oauth_state";

// This path lives under next-auth's own /api/auth/* namespace so it can
// reuse the callback URL already registered with Spotify, but it's a
// separate, unrelated route handler — Next.js resolves this exact-match
// segment ahead of the [...nextauth] catch-all, so the two don't collide.
export async function GET(request: Request) {
  const baseUrl = process.env.AUTH_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "AUTH_URL is not configured" }, { status: 500 });
  }
  const homeUrl = new URL("/", baseUrl);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(homeUrl);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(homeUrl);
  }

  const clientId = process.env.AUTH_SPOTIFY_ID;
  const clientSecret = process.env.AUTH_SPOTIFY_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Spotify is not configured" }, { status: 500 });
  }

  const redirectUri = `${baseUrl}/api/auth/callback/spotify`;
  const tokens = await exchangeCodeForTokens({ code, redirectUri, clientId, clientSecret });
  const providerAccountId = await fetchSpotifyProfileId(tokens.accessToken);

  await upsertProviderAccount(session.user.id, "spotify", {
    providerAccountId,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  });

  await refreshWidget("spotify", session.user.id);

  return NextResponse.redirect(homeUrl);
}
