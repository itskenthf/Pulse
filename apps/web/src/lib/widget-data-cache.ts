import { revalidateTag, unstable_cache } from "next/cache";
import type { CachedWidgetData } from "@pulse/database";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import type { ZodType } from "zod";

/**
 * Tag identifying one user's one widget's cache row — shared between the
 * read side here (`unstable_cache`'s `tags` option) and the write side
 * (`refreshWidget`'s `revalidateTag` call, apps/web/src/lib/refresh-widget.ts)
 * so a refresh invalidates exactly the widget it touched, not every widget.
 */
export function widgetCacheTag(userId: string, widgetId: string): string {
  return `widget-cache:${userId}:${widgetId}`;
}

/** Same idea as `widgetCacheTag`, for `widget_settings` instead of `widget_cache`. */
export function widgetSettingsTag(userId: string, widgetId: string): string {
  return `widget-settings:${userId}:${widgetId}`;
}

/**
 * This installed Next.js version's `revalidateTag` requires a second
 * `profile` argument (part of its newer "Cache Components"/`"use cache"`
 * caching model) even though this app doesn't otherwise opt into that
 * model anywhere (no `"use cache"` directive, no `cacheLife`/`cacheTag`
 * calls, no `experimental.cacheComponents` in next.config.ts) — the type
 * surface requires it regardless. `"max"` is one of Next's own named
 * profiles; the actual invalidation this app relies on (the tag's
 * `unstable_cache` entries becoming stale immediately) happens simply by
 * calling `revalidateTag` at all, so the specific profile chosen here
 * doesn't change this app's own behavior — this wrapper exists so that
 * reasoning is recorded in one place instead of repeated at every call site.
 */
export function revalidateWidgetTag(tag: string): void {
  revalidateTag(tag, "max");
}

/**
 * The dashboard's own widget grid was the actual bottleneck PERFORMANCE_AUDIT.md's
 * C3/H1 findings described: `page.tsx`'s `WidgetSlot` re-reads every
 * registered widget's cache + settings on every render, and a single
 * widget's refresh action forces the whole page to re-render (so all of
 * them re-run), even though only one widget's data actually changed.
 *
 * Wrapping the read side in `unstable_cache`, tagged per `(userId, widgetId)`,
 * lets `refreshWidget`'s `revalidateTag` call invalidate just the one widget
 * that changed — every other widget's read is served from Next's Data Cache
 * instead of hitting Supabase again. `revalidate` is set to the widget's own
 * declared `refreshInterval` (already a per-widget property on `Widget` —
 * see packages/sdk/src/widget.ts) as a time-based safety net: the cron
 * scheduler (apps/web/src/app/api/cron/route.ts) also calls `revalidateTag`
 * after each refresh, so this bound is rarely what actually triggers a
 * re-read, but it guarantees a cache entry is never staler than the widget
 * already accepts being stale for by design, even if a revalidateTag call
 * were ever missed.
 */
export function readCachedWidgetCache<T>(
  userId: string,
  widgetId: string,
  refreshIntervalSeconds: number,
  schema?: ZodType<T>,
): Promise<CachedWidgetData<T> | null> {
  return unstable_cache(
    async () => readWidgetCache<T>(userId, widgetId, schema),
    ["widget-cache", userId, widgetId],
    { tags: [widgetCacheTag(userId, widgetId)], revalidate: refreshIntervalSeconds },
  )();
}

/** Same idea as `readCachedWidgetCache`, for `widget_settings`. */
export function readCachedWidgetSettings<T>(
  userId: string,
  widgetId: string,
  refreshIntervalSeconds: number,
): Promise<T | null> {
  return unstable_cache(
    async () => readWidgetSettings<T>(userId, widgetId),
    ["widget-settings", userId, widgetId],
    { tags: [widgetSettingsTag(userId, widgetId)], revalidate: refreshIntervalSeconds },
  )();
}
