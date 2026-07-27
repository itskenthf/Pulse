import { getWidget } from "@pulse/sdk";
import { readWidgetCache, writeMemories, writeWidgetCache } from "@pulse/database";
import "./register-widgets";

/**
 * A hung upstream API (not an erroring one — one that never responds) used
 * to be able to stall an entire cron batch until the platform's own
 * function-execution timeout killed it, losing results for widgets that
 * had already finished. Every widget's fetchData gets its own budget
 * instead, so one bad call only fails that one widget.
 */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * The scheduler-side half of the cron-first data flow (reference doc §5):
 * call the widget's fetchData(), write the result to widget_cache. Used by
 * both the cron route and the manual "Refresh" action — the only
 * difference is who triggers it and for which user.
 *
 * Also the single choke point for memory generation (docs/MEMORY_ROADMAP.md
 * M1): every refresh path runs the widget's `deriveMemories` diff against
 * the previous cached snapshot before overwriting it, so a widget doesn't
 * need its own separate refresh/memory pipeline.
 */
export async function refreshWidget(widgetId: string, userId: string): Promise<void> {
  const widget = getWidget(widgetId);
  if (!widget) throw new Error(`Unknown widget "${widgetId}"`);

  const previous = await readWidgetCache(userId, widgetId, widget.dataSchema);
  const data = await widget.fetchData({ userId, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

  const events = widget.deriveMemories?.(previous?.data ?? null, data) ?? [];
  if (events.length > 0) {
    await writeMemories(userId, widgetId, events);
  }

  await writeWidgetCache(userId, widgetId, data);
}
