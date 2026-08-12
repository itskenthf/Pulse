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

