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

export async function writeWidgetCache(
  userId: string,
  widgetId: string,
  data: unknown,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("widget_cache")
    .upsert(
      { user_id: userId, widget_id: widgetId, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id,widget_id" },
    );

  if (error) throw new Error(`Failed to write widget cache: ${error.message}`);
}
