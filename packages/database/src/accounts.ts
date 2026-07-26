import { createServiceClient } from "./client";

/**
 * Reads the OAuth access token Auth.js stored for a user's linked provider
 * account (next_auth.accounts). This is how widgets get API access for
 * services the user signed in with — no second OAuth flow needed for
 * providers that are also login providers (e.g. GitHub).
 */
export async function readProviderAccessToken(
  userId: string,
  provider: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .schema("next_auth")
    .from("accounts")
    .select("access_token")
    .eq("userId", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read ${provider} account token: ${error.message}`);
  }
  return (data?.access_token as string | null) ?? null;
}

export interface ProviderAccount {
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  /** Unix seconds. */
  expiresAt: number | null;
}

/**
 * Reads the full stored token record for a provider — used by widgets that
 * need to refresh an expired access token themselves (Spotify), unlike
 * readProviderAccessToken's read-only-token shortcut (GitHub, whose tokens
 * don't expire).
 */
export async function readProviderAccount(
  userId: string,
  provider: string,
): Promise<ProviderAccount | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .schema("next_auth")
    .from("accounts")
    .select('"providerAccountId", access_token, refresh_token, expires_at')
    .eq("userId", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read ${provider} account: ${error.message}`);
  }
  if (!data) return null;

  return {
    providerAccountId: data.providerAccountId as string,
    accessToken: data.access_token as string | null,
    refreshToken: data.refresh_token as string | null,
    expiresAt: data.expires_at as number | null,
  };
}

/**
 * Creates or updates a provider account's stored tokens — used by a
 * widget's own OAuth connect flow (Spotify) rather than Auth.js's login
 * adapter, and by token-refresh logic updating an existing row. Omitting
 * refreshToken preserves whatever refresh token is already stored, since
 * providers often don't return a new one on refresh.
 */
export async function upsertProviderAccount(
  userId: string,
  provider: string,
  account: {
    providerAccountId: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: number;
  },
): Promise<void> {
  const supabase = createServiceClient();

  const payload: Record<string, unknown> = {
    userId,
    provider,
    type: "oauth",
    providerAccountId: account.providerAccountId,
    access_token: account.accessToken,
    expires_at: account.expiresAt,
    token_type: "bearer",
  };
  if (account.refreshToken) {
    payload.refresh_token = account.refreshToken;
  }

  const { error } = await supabase
    .schema("next_auth")
    .from("accounts")
    .upsert(payload, { onConflict: "provider,providerAccountId" });

  if (error) {
    throw new Error(`Failed to store ${provider} account: ${error.message}`);
  }
}

/**
 * Updates a provider account's tokens only if its stored refresh token
 * still matches `expectedRefreshToken` — a compare-and-swap guard against
 * two concurrent token refreshes for the same user (e.g. the cron
 * scheduler and a manual "Refresh all" click landing close together)
 * both reading the same expired token and racing to write their own
 * refreshed result. Returns false when the guard fails (someone else's
 * refresh already landed since the caller read the account), so the
 * caller can defer to that write instead of overwriting it with its own,
 * possibly-stale one. Unlike upsertProviderAccount (used for a brand-new
 * connection, where there's nothing to race against yet), this is an
 * UPDATE, not an upsert — it only ever applies to an existing row.
 */
export async function updateProviderAccountTokenIfCurrent(
  userId: string,
  provider: string,
  expectedRefreshToken: string,
  update: { accessToken: string; refreshToken?: string | null; expiresAt: number },
): Promise<boolean> {
  const supabase = createServiceClient();

  const payload: Record<string, unknown> = {
    access_token: update.accessToken,
    expires_at: update.expiresAt,
  };
  if (update.refreshToken) {
    payload.refresh_token = update.refreshToken;
  }

  const { data, error } = await supabase
    .schema("next_auth")
    .from("accounts")
    .update(payload)
    .eq("userId", userId)
    .eq("provider", provider)
    .eq("refresh_token", expectedRefreshToken)
    .select("userId");

  if (error) {
    throw new Error(`Failed to update ${provider} account: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}
