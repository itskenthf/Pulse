import { createServiceClient } from "./client";

export async function readWidgetSettings<T>(
  userId: string,
  widgetId: string,
): Promise<T | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("widget_settings")
    .select("settings")
    .eq("user_id", userId)
    .eq("widget_id", widgetId)
    .maybeSingle();

  if (error) throw new Error(`Failed to read widget settings: ${error.message}`);
  return data ? (data.settings as T) : null;
}

export async function writeWidgetSettings(
  userId: string,
  widgetId: string,
  settings: unknown,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("widget_settings")
    .upsert(
      { user_id: userId, widget_id: widgetId, settings, updated_at: new Date().toISOString() },
      { onConflict: "user_id,widget_id" },
    );

  if (error) throw new Error(`Failed to write widget settings: ${error.message}`);
}
