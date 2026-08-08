import { z } from "zod";

const rssItemSchema = z.object({
  title: z.string(),
  link: z.string(),
  sourceName: z.string(),
  publishedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk).
 */
export const rssDataSchema = z.object({
  items: z.array(rssItemSchema),
  fetchedAt: z.string(),
});

export type RssItem = z.infer<typeof rssItemSchema>;
export type RssData = z.infer<typeof rssDataSchema>;

export interface RssSource {
  name: string;
  url: string;
  /** Lower sorts first. Items are grouped by this before being sorted
   *  by recency within each tier — see fetch.ts's tier-building and
   *  mix.ts's `mixByPriority` — not purely chronological across all
   *  sources, by explicit request. */
  priority: number;
}

export interface RssSettings {
  sources: RssSource[];
}
