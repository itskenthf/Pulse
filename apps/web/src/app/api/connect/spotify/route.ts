import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizeUrl } from "@pulse/adapter-spotify";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "spotify_oauth_state";
const SCOPE = "user-top-read";

/**
 * Starts the Spotify connect flow. Deliberately not a NextAuth provider —
 * see docs/DECISIONS.md for why (avoids relying on undocumented account-
 * linking behavior in a beta library for a "connect a second provider to
 * an already-signed-in user" flow NextAuth doesn't support out of the box).
 */
export async function GET() {
  const session = await auth();
  const baseUrl = process.env.AUTH_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "AUTH_URL is not configured" }, { status: 500 });
  }
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  const clientId = process.env.AUTH_SPOTIFY_ID;
  if (!clientId) {
    return NextResponse.json({ error: "AUTH_SPOTIFY_ID is not configured" }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${baseUrl}/api/auth/callback/spotify`;
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state, scope: SCOPE });

  return NextResponse.redirect(authorizeUrl);
}
