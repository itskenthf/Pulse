import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only. Bypasses RLS, so it must never be
 * imported into client components or exposed via NEXT_PUBLIC_* env vars.
 *
 * Wrapped in React's `cache()` so every call within the same request/render
 * pass reuses one client instead of constructing a fresh one — a single
 * dashboard load calls this a dozen-plus times (once per widget's cache
 * read, settings read, etc.), and none of them need their own client.
 */
export const createServiceClient = cache((): SupabaseClient => {
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
});
