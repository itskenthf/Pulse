const AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyTokens {
  accessToken: string;
  /** Spotify often omits this on refresh — null means "keep the existing one." */
  refreshToken: string | null;
  /** Unix seconds. */
  expiresAt: number;
}

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope);
  return url.toString();
}

async function requestTokens(body: URLSearchParams, clientId: string, clientSecret: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const parsed = (await response.json()) as SpotifyTokenResponse;
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token ?? null,
    expiresAt: Math.floor(Date.now() / 1000) + parsed.expires_in,
  };
}

export async function exchangeCodeForTokens(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<SpotifyTokens> {
  return requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
    }),
    params.clientId,
    params.clientSecret,
  );
}

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<SpotifyTokens> {
  return requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
    }),
    params.clientId,
    params.clientSecret,
  );
}

export async function fetchSpotifyProfileId(accessToken: string): Promise<string> {
  const response = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Spotify profile request failed: ${response.status}`);
  }
  const body = (await response.json()) as { id?: string };
  if (!body.id) {
    throw new Error("Spotify profile response missing id");
  }
  return body.id;
}
