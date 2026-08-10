import { z } from "zod";

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk). `insights` is a plain string list —
 * each rule function in `src/rules/` produces already-formatted text, so
 * there's no structured shape to validate beyond "an array of strings."
 */
export const insightsDataSchema = z.object({
  insights: z.array(z.string()),
  fetchedAt: z.string(),
});

export type InsightsData = z.infer<typeof insightsDataSchema>;
