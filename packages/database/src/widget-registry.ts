import { createServiceClient } from "./client";

/**
 * Widget ids already confirmed registered this server instance's lifetime.
 * A widget's id/name/description are static constants, never changed at
 * runtime, so once an upsert has succeeded there is nothing left for a
 * repeat call to accomplish — without this, every widget's fetchData
 * issued an unconditional write on every single refresh, forever (see
 * docs/DECISIONS.md's 2026-08-12 entry). Only populated after a
 * *successful* upsert, so a failure never poisons the cache into skipping
 * a registration that hasn't actually landed. Module-level, not a DB
 * round trip — self-healing across a cold start/redeploy, same as before.
 */
const registeredWidgetIds = new Set<string>();

/**
 * Upserts a widget's metadata row so `widget_cache`/`widget_settings`
 * foreign keys have something to point at. Called from each widget's own
 * fetch/settings code rather than a manual seed migration, so registering
 * a new widget never requires a schema or data migration.
 */
export async function ensureWidgetRegistered(
  id: string,
  name: string,
  description?: string,
): Promise<void> {
  if (registeredWidgetIds.has(id)) return;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("widget_registry")
    .upsert({ id, name, description: description ?? null }, { onConflict: "id" });

  if (error) throw new Error(`Failed to register widget "${id}": ${error.message}`);
  registeredWidgetIds.add(id);
}
