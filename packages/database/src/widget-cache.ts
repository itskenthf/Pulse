import type { ZodType } from "zod";
import { createServiceClient } from "./client";

export interface CachedWidgetData<T> {
  data: T;
  updatedAt: string;
}

/**
 * `schema` is optional so callers can adopt it incrementally per widget
 * (see `Widget.dataSchema` in @pulse/sdk). Without it, this falls back to
 * the previous behavior — a compile-time-only cast, no runtime check.
 * With it, a cache row that no longer matches the widget's current data
 * contract throws here instead of silently reaching render() typed as a
 * shape it doesn't actually have.
 */
export async function readWidgetCache<T>(
  userId: string,
  widgetId: string,
  schema?: ZodType<T>,
): Promise<CachedWidgetData<T> | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("widget_cache")
    .select("data, updated_at")
    .eq("user_id", userId)
    .eq("widget_id", widgetId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read widget cache: ${error.message}`);
  if (!data) return null;

  if (!schema) {
    return { data: data.data as T, updatedAt: data.updated_at as string };
  }

  const parsed = schema.safeParse(data.data);
  if (!parsed.success) {
    throw new Error(
      `Cached data for widget "${widgetId}" no longer matches its expected shape: ${parsed.error.message}`,
    );
  }

  return { data: parsed.data, updatedAt: data.updated_at as string };
}

/**
 * Just the `updated_at` column, no `data` — for callers that only need to
 * know how stale a widget's cache is (e.g. deciding whether a background
 * refresh is actually due) without paying for the full row transfer and,
 * when a schema is involved, its parse cost.
 */
export async function readWidgetCacheUpdatedAt(
  userId: string,
  widgetId: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("widget_cache")
    .select("updated_at")
    .eq("user_id", userId)
    .eq("widget_id", widgetId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read widget cache: ${error.message}`);
  return (data?.updated_at as string | undefined) ?? null;
}

/**
 * `readAsOf`, when given, guards against a stale concurrent write clobbering
 * a fresher one — a compare-and-swap idea applied to widget_cache. Two
 * overlapping `refreshWidget` calls for the same
 * user/widget (e.g. the cron scheduler and a user's own post-mutation
 * refresh landing close together) can otherwise race: whichever write's
 * network round trip lands last in Postgres wins outright, even if it read
 * its data *before* the other call's write, silently reverting a newer
 * result to an older one (see docs/DECISIONS.md — this is how a just-added
 * task/note could vanish until the next refresh cycle).
 *
 * Passing `readAsOf` (the time this call started reading its source of
 * truth, before any external fetch) makes the write conditional: it only
 * overwrites an existing row if that row is *older* than `readAsOf` — i.e.
 * nothing fresher has landed since this call started. If a fresher row
 * already exists, the write is silently skipped rather than overwriting it.
 * Callers with no meaningful "read time" to guard against (e.g. quote
 * cycling, which reads and writes within the same short call) can omit it
 * and get the previous unconditional upsert behavior.
 */
export async function writeWidgetCache(
  userId: string,
  widgetId: string,
  data: unknown,
  readAsOf?: string,
): Promise<void> {
  const supabase = createServiceClient();
  const payload = { data, updated_at: new Date().toISOString() };

  if (!readAsOf) {
    const { error } = await supabase
      .from("widget_cache")
      .upsert({ user_id: userId, widget_id: widgetId, ...payload }, { onConflict: "user_id,widget_id" });

    if (error) throw new Error(`Failed to write widget cache: ${error.message}`);
    return;
  }

  const { data: updated, error: updateError } = await supabase
    .from("widget_cache")
    .update(payload)
    .eq("user_id", userId)
    .eq("widget_id", widgetId)
    .lt("updated_at", readAsOf)
    .select("user_id");

  if (updateError) throw new Error(`Failed to write widget cache: ${updateError.message}`);
  if ((updated?.length ?? 0) > 0) return;

  // No existing row was older than readAsOf — either there's no row yet
  // (first write for this widget), or a fresher write already landed since
  // this call started reading. `ignoreDuplicates` makes the insert a no-op
  // in the latter case instead of overwriting that fresher row.
  const { error: insertError } = await supabase
    .from("widget_cache")
    .upsert(
      { user_id: userId, widget_id: widgetId, ...payload },
      { onConflict: "user_id,widget_id", ignoreDuplicates: true },
    );

  if (insertError) throw new Error(`Failed to write widget cache: ${insertError.message}`);
}
