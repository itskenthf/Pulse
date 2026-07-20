import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only. Bypasses RLS, so it must never be
 * imported into client components or exposed via NEXT_PUBLIC_* env vars.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
