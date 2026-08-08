import { fetchFeed } from "@pulse/adapter-rss";
import { ensureWidgetRegistered } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { MAX_ITEMS, RSS_SOURCES, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { mixByPriority } from "./mix";
import type { RssData, RssItem } from "./types";

/**
 * Each source is fetched and caught individually — one dead/slow feed
 * (a wrong URL, a temporary outage) should only mean fewer items from
 * that source, not an empty widget or a failed refresh for everyone
 * else's feeds. Errors are logged so a persistently broken source is
 * visible in server logs without surfacing as a user-facing error.
 */
export async function fetchRssData(context: WidgetFetchContext): Promise<RssData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const perSource = await Promise.all(
    RSS_SOURCES.map(async (source): Promise<RssItem[]> => {
      try {
        const feed = await fetchFeed(source.url, context.signal);
        return feed.items.map((item) => ({
          title: item.title,
          link: item.link,
          sourceName: source.name,
          publishedAt: item.publishedAt,
        }));
      } catch (err) {
        console.error(`RSS fetch failed for "${source.name}" (${source.url}):`, err);
        return [];
      }
    }),
  );

  const priorities = [...new Set(RSS_SOURCES.map((source) => source.priority))].sort(
    (a, b) => a - b,
  );
  const tiers = priorities.map((priority) =>
    RSS_SOURCES.flatMap((source, index) => (source.priority === priority ? perSource[index]! : []))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
  );

  // Grouped by source priority first (game news, then Apple blogs, then
  // GitHub, per RSS_SOURCES), recency breaking ties within a tier — but
  // capped per tier (see mix.ts) so a prolific tier can't crowd out
  // every other source entirely.
  const items = mixByPriority(tiers, MAX_ITEMS);

  return {
    items,
    fetchedAt: new Date().toISOString(),
  };
}
