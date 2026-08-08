import type { RssSource } from "./types";

export const WIDGET_ID = "rss";
export const WIDGET_NAME = "RSS";
export const WIDGET_DESCRIPTION = "Latest posts from your favorite blogs";
export const MAX_ITEMS = 6;

/**
 * Seeded default source list — used as `settings()`'s default and as
 * `fetchRssData`'s fallback before any settings have been saved (see
 * settings.ts). Editable per-user via the widget's Settings form
 * (settings-form-fields.tsx) instead of requiring a code change +
 * redeploy for every source-list tweak, unlike the fully hardcoded v1
 * list this replaces — see docs/DECISIONS.md.
 *
 * There's no single official "Steam blog" feed, so Steam is represented
 * by the two games actually tracked by the Steam widget's SteamID in
 * this default set — see cover-art.tsx for the same two appIds — via
 * Steam's real per-app news feed format
 * (store.steampowered.com/feeds/news/app/<appid>/).
 */
export const DEFAULT_RSS_SOURCES: RssSource[] = [
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
