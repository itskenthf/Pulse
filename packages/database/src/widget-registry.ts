import { createServiceClient } from "./client";

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
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("widget_registry")
    .upsert({ id, name, description: description ?? null }, { onConflict: "id" });

  if (error) throw new Error(`Failed to register widget "${id}": ${error.message}`);
}
