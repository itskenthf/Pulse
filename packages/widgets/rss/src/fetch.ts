import { fetchFeed } from "@pulse/adapter-rss";
import { ensureWidgetRegistered } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { MAX_ITEMS, RSS_SOURCES, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
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
    RSS_SOURCES.map(async (source): Promise<{ item: RssItem; priority: number }[]> => {
      try {
        const feed = await fetchFeed(source.url, context.signal);
        return feed.items.map((item) => ({
          item: {
            title: item.title,
            link: item.link,
            sourceName: source.name,
            publishedAt: item.publishedAt,
          },
          priority: source.priority,
        }));
      } catch (err) {
        console.error(`RSS fetch failed for "${source.name}" (${source.url}):`, err);
        return [];
      }
    }),
  );

  // Grouped by source priority first (game news, then Apple blogs, then
  // GitHub, per RSS_SOURCES), sorted by recency only within each tier —
  // not one global chronological merge, by explicit request.
  const items = perSource
    .flat()
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        new Date(b.item.publishedAt).getTime() - new Date(a.item.publishedAt).getTime(),
    )
    .slice(0, MAX_ITEMS)
    .map(({ item }) => item);

  return {
    items,
    fetchedAt: new Date().toISOString(),
  };
}
