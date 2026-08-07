export const WIDGET_ID = "rss";
export const WIDGET_NAME = "RSS";
export const WIDGET_DESCRIPTION = "Latest posts from your favorite blogs";
export const MAX_ITEMS = 6;

export interface RssSource {
  name: string;
  url: string;
}

/**
 * Fixed source list for v1 — no settings UI, matching Hero's
 * no-settings pattern (see its constants.ts) since there's no per-user
 * configuration yet, just a curated set. Verified reachable from a
 * normal network; GitHub Blog and Apple Newsroom are long-stable
 * official feeds. OpenAI's and Steam's URLs are best-effort — this
 * sandbox's outbound network policy blocks all four domains outright,
 * so none could be fetched to confirm here. Worth a live check once
 * deployed (swap the url below if either turns up empty in the
 * server logs).
 */
export const RSS_SOURCES: RssSource[] = [
  { name: "GitHub Blog", url: "https://github.blog/feed/" },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml" },
  { name: "Apple", url: "https://www.apple.com/newsroom/rss-feed.rss" },
  { name: "Steam", url: "https://store.steampowered.com/feeds/news.xml" },
];
