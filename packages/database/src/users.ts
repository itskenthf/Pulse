import { createServiceClient } from "./client";

/**
 * Reads user ids from the next_auth schema (owned by @auth/supabase-adapter,
 * see docs/DECISIONS.md) — used by the cron route to know who to refresh
 * widgets for.
 */
export async function listUserIds(): Promise<string[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.schema("next_auth").from("users").select("id");

  if (error) throw new Error(`Failed to list users: ${error.message}`);
  return (data ?? []).map((row) => row.id as string);
}

/**
 * Reads a user's display name from their OAuth login profile (next_auth's
 * own users table) — lets a widget greet by name automatically instead of
 * needing a separate name setting.
 */
export async function readUserName(userId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .schema("next_auth")
    .from("users")
    .select("name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read user name: ${error.message}`);
  return (data?.name as string | null) ?? null;
}
