import { z } from "zod";

const digestEntrySchema = z.object({
  source: z.string(),
  count: z.number().int().positive(),
  titles: z.array(z.string()),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk). No dedicated table of its own —
 * this is a read-only grouping of the existing `memories` table (M1),
 * same "no table, reads existing data directly" shape as Insights.
 */
export const dailyDigestDataSchema = z.object({
  entries: z.array(digestEntrySchema),
  fetchedAt: z.string(),
});

export type DigestEntry = z.infer<typeof digestEntrySchema>;
export type DailyDigestData = z.infer<typeof dailyDigestDataSchema>;
