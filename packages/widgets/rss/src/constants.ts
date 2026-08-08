export const WIDGET_ID = "rss";
export const WIDGET_NAME = "RSS";
export const WIDGET_DESCRIPTION = "Latest posts from your favorite blogs";
export const MAX_ITEMS = 6;

export interface RssSource {
  name: string;
  url: string;
  /** Lower sorts first. Items are grouped by this before being sorted
   *  by recency within each tier — see fetch.ts — not purely
   *  chronological across all sources, by explicit request. */
  priority: number;
}

/**
 * Fixed source list for v1 — no settings UI, matching Hero's
 * no-settings pattern (see its constants.ts) since there's no per-user
 * configuration yet, just a curated set.
 *
 * There's no single official "Steam blog" feed, so Steam is the two
 * games actually tracked by the Steam widget's SteamID — see
 * cover-art.tsx for the same two appIds — via Steam's real per-app news
 * feed format (store.steampowered.com/feeds/news/app/<appid>/).
 * OpenAI dropped by request; Apple's official newsroom feed was never
 * confirmed reachable, replaced with two established Apple-focused
 * blogs instead.
 */
export const RSS_SOURCES: RssSource[] = [
  { name: "Palworld", url: "https://store.steampowered.com/feeds/news/app/1623730/", priority: 1 },
  {
    name: "Forza Horizon 6",
    url: "https://store.steampowered.com/feeds/news/app/2483190/",
    priority: 1,
  },
  { name: "9to5Mac", url: "https://9to5mac.com/feed/", priority: 2 },
  { name: "MacRumors", url: "https://feeds.macrumors.com/MacRumors-All", priority: 2 },
  { name: "GitHub Blog", url: "https://github.blog/feed/", priority: 3 },
];
