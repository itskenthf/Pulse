import { getWidget } from "@pulse/sdk";
import {
  readWidgetCache,
  readWidgetCacheUpdatedAt,
  writeMemories,
  writeWidgetCache,
} from "@pulse/database";
import { revalidateWidgetTag, widgetCacheTag } from "./widget-data-cache";
import "./register-widgets";

/**
 * A hung upstream API (not an erroring one — one that never responds) used
 * to be able to stall an entire cron batch until the platform's own
 * function-execution timeout killed it, losing results for widgets that
 * had already finished. Every widget's fetchData gets its own budget
 * instead, so one bad call only fails that one widget.
 */
const FETCH_TIMEOUT_MS = 10_000;

export interface RefreshWidgetOptions {
  /**
   * When false, skips the actual fetchData/cache write if the widget's
   * cache is still younger than its own `refreshInterval` — for
   * background/auto-triggered refreshes (cron, "refresh all") so they
   * don't call a widget's external API more often than the widget itself
   * says it needs (see docs/DECISIONS.md's 2026-08-12 entry — cron
   * previously ignored refreshInterval entirely, over-calling Steam/RSS by
   * up to 6x). Explicit single-widget actions (a user's own "Refresh"
   * click, a settings save) default to true — they should always get
   * real, current data, since the user asked for it directly.
   */
  force?: boolean;
  /**
   * Skips `widget.fetchData()`'s own DB re-read entirely and writes this
   * directly as the widget's new cache value instead — for a write action
   * whose own mutation already determined the widget's full next state
   * (e.g. Meals' setMealChecked returning the row its own upsert just
   * wrote), where fetchData's normal re-read would just re-derive
   * something already known a moment ago. Left unset, behavior is
   * unchanged: fetchData() runs as usual. Not a general substitute for
   * fetchData — most widgets' data is composed from more than the one
   * thing a given write touches (e.g. Nutrition's goals/history), so this
   * only makes sense for a caller that has assembled the *complete*
   * TData shape itself.
   */
  knownData?: unknown;
}

/**
 * The scheduler-side half of the cron-first data flow (reference doc §5):
 * call the widget's fetchData(), write the result to widget_cache. Used by
 * both the cron route and the manual "Refresh" action — the only
 * difference is who triggers it and for which user.
 *
 * Also the single choke point for memory generation (docs/MEMORY_ROADMAP.md
 * M1): every refresh path runs the widget's `deriveMemories` diff against
 * the previous cached snapshot, so a widget doesn't need its own separate
 * refresh/memory pipeline. The cache write happens first and
 * unconditionally — memory writing is a secondary, best-effort feature on
 * top of the widget's actual data refresh, and must never be able to
 * regress it (e.g. a missing `memories` table shouldn't stop GitHub's
 * cache from updating, and shouldn't make a healthy refresh report as
 * "failed" to the manual refresh-all action).
 */
export async function refreshWidget(
  widgetId: string,
  userId: string,
  options: RefreshWidgetOptions = {},
): Promise<void> {
  const { force = true, knownData } = options;
  const widget = getWidget(widgetId);
  if (!widget) throw new Error(`Unknown widget "${widgetId}"`);

  // Captured before any read starts — see writeWidgetCache's readAsOf
  // doc comment for why this guards against a concurrent stale write.
  const readAsOf = new Date().toISOString();

  // The freshness check exists to avoid an unnecessary fetchData() call —
  // moot when there's no fetchData() call to avoid, since knownData is
  // already the write's own real, current result.
  if (!force && knownData === undefined) {
    const lastUpdatedAt = await readWidgetCacheUpdatedAt(userId, widgetId).catch((err) => {
      console.error(`Failed to read cache freshness for widget "${widgetId}":`, err);
      return null;
    });
    if (lastUpdatedAt) {
      const ageMs = Date.now() - new Date(lastUpdatedAt).getTime();
      if (ageMs < widget.refreshInterval * 1000) return;
    }
  }

  // `previous` (used below only for deriveMemories) doesn't depend on
  // fetchData's result or vice versa — reading both concurrently instead
  // of sequentially roughly halves this function's own latency. Only read
  // at all for widgets that actually implement deriveMemories — for every
  // other widget this used to be a full row fetched and immediately
  // discarded (see docs/DECISIONS.md's 2026-08-12 entry). Its read is
  // validated through the widget's own dataSchema, so a widget whose data
  // contract changed across a deploy can find its *own* previously written
  // row no longer parses (see Widget.dataSchema's doc comment in
  // @pulse/sdk) — caught and treated as "no previous data" rather than
  // failing the whole refresh, same "best-effort, never regress the real
  // refresh" principle as the memory write below. Without this, that
  // parse failure would otherwise block every future refresh permanently
  // (cron included): nothing could ever write a schema-compliant row to
  // replace the stale one, since this same read runs before fetchData/
  // writeWidgetCache on every attempt.
  const [previous, data] = await Promise.all([
    widget.deriveMemories
      ? readWidgetCache(userId, widgetId, widget.dataSchema).catch((err) => {
          console.error(`Failed to read previous cache for widget "${widgetId}":`, err);
          return null;
        })
      : Promise.resolve(null),
    knownData !== undefined
      ? Promise.resolve(knownData)
      : widget.fetchData({ userId, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
  ]);

  await writeWidgetCache(userId, widgetId, data, readAsOf);
  // Narrow, per-widget invalidation — see widget-data-cache.ts's own doc
  // comment for why this (not a page-wide revalidatePath) is what actually
  // keeps a single widget's refresh from forcing every other widget's
  // dashboard read to re-hit Supabase too. Every caller of refreshWidget
  // (the cron scheduler, every manual refresh/settings-save action) gets
  // this for free from this one call site.
  revalidateWidgetTag(widgetCacheTag(userId, widgetId));

  const events = widget.deriveMemories?.(previous?.data ?? null, data) ?? [];
  if (events.length > 0) {
    try {
      await writeMemories(userId, widgetId, events);
    } catch (err) {
      console.error(`Failed to write memories for widget "${widgetId}":`, err);
    }
  }
}
