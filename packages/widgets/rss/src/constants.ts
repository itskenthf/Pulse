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
 * configuration yet, just a curated set. GitHub Blog is confirmed
 * working in production; OpenAI too. There's no single official "Steam
 * blog" feed, so Steam's original guessed URL (feeds/news.xml, a plain
 * 404) was replaced with Steam's real documented per-app news feed
 * format (store.steampowered.com/feeds/news/app/<appid>/) for the two
 * games actually tracked by the Steam widget's SteamID — see
 * cover-art.tsx for the same two appIds. Apple's URL is still an
 * unconfirmed guess (this sandbox can't reach any of these domains to
 * verify) — worth a live check.
 */
export const RSS_SOURCES: RssSource[] = [
  { name: "GitHub Blog", url: "https://github.blog/feed/" },
  { name: "OpenAI", url: "https://openai.com/news/rss.xml" },
  { name: "Apple", url: "https://www.apple.com/newsroom/rss-feed.rss" },
  { name: "Palworld", url: "https://store.steampowered.com/feeds/news/app/1623730/" },
  { name: "Forza Horizon 6", url: "https://store.steampowered.com/feeds/news/app/2483190/" },
];
