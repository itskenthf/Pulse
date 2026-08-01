import { z } from "zod";

const contributionDaySchema = z.object({
  date: z.string(),
  count: z.number(),
  level: z.number(),
});

const contributionWeekSchema = z.object({
  days: z.array(contributionDaySchema),
});

const activitySummarySchema = z.object({
  commitCount: z.number(),
  repositoriesWithCommits: z.number(),
  pullRequestsOpened: z.number(),
  repositoriesCreated: z.number(),
  periodStart: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with
 * @pulse/adapter-github's `NormalizedContributions`/`ActivitySummary` by
 * hand, since a plain TS interface can't be turned into a schema
 * automatically.
 */
export const githubDataSchema = z.object({
  totalToday: z.number(),
  totalThisWeek: z.number(),
  totalThisYear: z.number(),
  weeks: z.array(contributionWeekSchema),
  fetchedAt: z.string(),
  activitySummary: activitySummarySchema.nullable(),
});

export type GitHubData = z.infer<typeof githubDataSchema>;
