import { getWidget } from "@pulse/sdk";
import { writeWidgetCache } from "@pulse/database";
import "./register-widgets";

/**
 * The scheduler-side half of the cron-first data flow (reference doc §5):
 * call the widget's fetchData(), write the result to widget_cache. Used by
 * both the cron route and the manual "Refresh" action — the only
 * difference is who triggers it and for which user.
 */
export async function refreshWidget(widgetId: string, userId: string): Promise<void> {
  const widget = getWidget(widgetId);
  if (!widget) throw new Error(`Unknown widget "${widgetId}"`);

  const data = await widget.fetchData({ userId });
  await writeWidgetCache(userId, widgetId, data);
}
