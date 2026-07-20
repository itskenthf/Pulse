import { createServiceClient } from "./client";

export interface CachedWidgetData<T> {
  data: T;
  updatedAt: string;
}

export async function readWidgetCache<T>(
  userId: string,
  widgetId: string,
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

  return { data: data.data as T, updatedAt: data.updated_at as string };
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
