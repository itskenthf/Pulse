import { z } from "zod";

const contributionDaySchema = z.object({
  date: z.string(),
  count: z.number(),
  level: z.number(),
});

const contributionWeekSchema = z.object({
  days: z.array(contributionDaySchema),
});

const latestActivitySchema = z.object({
  repoName: z.string(),
  repoUrl: z.string(),
  commitMessage: z.string(),
  commitUrl: z.string(),
  committedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with
 * @pulse/adapter-github's `NormalizedContributions`/`LatestActivity` by
 * hand, since a plain TS interface can't be turned into a schema
 * automatically.
 */
export const githubDataSchema = z.object({
  totalToday: z.number(),
  totalThisWeek: z.number(),
  totalThisYear: z.number(),
  weeks: z.array(contributionWeekSchema),
  fetchedAt: z.string(),
  latestActivity: latestActivitySchema.nullable(),
});

export type GitHubData = z.infer<typeof githubDataSchema>;
