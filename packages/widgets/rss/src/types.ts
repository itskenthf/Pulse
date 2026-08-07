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
