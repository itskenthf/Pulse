export interface ContributionDay {
  date: string;
  count: number;
  /** 0-4, GitHub's own intensity bucketing for heatmap coloring. */
  level: number;
}

export interface ContributionWeek {
  days: ContributionDay[];
}

export interface NormalizedContributions {
  totalToday: number;
  totalThisWeek: number;
  totalThisYear: number;
  /** Oldest → newest. Only the requested window, not the full year. */
  weeks: ContributionWeek[];
  fetchedAt: string;
}

interface GraphQLCalendarDay {
  date?: string;
  contributionCount?: number;
  contributionLevel?: string;
}

interface GraphQLResponse {
  data?: {
    viewer?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: { contributionDays?: GraphQLCalendarDay[] }[];
        };
      };
    };
  };
  errors?: { message?: string }[];
}

export interface ActivitySummary {
  commitCount: number;
  repositoriesWithCommits: number;
  pullRequestsOpened: number;
  repositoriesCreated: number;
  /** ISO, start of the month this summary covers. */
  periodStart: string;
}

interface ActivitySummaryGraphQLResponse {
  data?: {
    viewer?: {
      contributionsCollection?: {
        totalCommitContributions?: number;
        totalRepositoriesWithContributedCommits?: number;
        totalPullRequestContributions?: number;
        totalRepositoryContributions?: number;
      };
    };
  };
  errors?: { message?: string }[];
}

const ACTIVITY_SUMMARY_QUERY = `
  query($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalRepositoriesWithContributedCommits
        totalPullRequestContributions
        totalRepositoryContributions
      }
    }
  }
`;

const LEVELS: Record<string, number> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CONTRIBUTIONS_QUERY = `
  query($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

async function queryCalendar(
  accessToken: string,
  from: Date,
  to: Date,
  signal?: AbortSignal,
): Promise<{ total: number; weeks: ContributionWeek[] }> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { from: from.toISOString(), to: to.toISOString() },
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse;
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${body.errors[0]?.message ?? "unknown"}`);
  }

  const calendar = body.data?.viewer?.contributionsCollection?.contributionCalendar;
  if (!calendar?.weeks) {
    throw new Error("GitHub GraphQL response missing contribution calendar");
  }

  const weeks: ContributionWeek[] = calendar.weeks.map((week) => ({
    days: (week.contributionDays ?? []).map((day) => ({
      date: day.date ?? "",
      count: day.contributionCount ?? 0,
      level: LEVELS[day.contributionLevel ?? "NONE"] ?? 0,
    })),
  }));

  return { total: calendar.totalContributions ?? 0, weeks };
}

/**
 * Two calendar queries: a ~12-week window for the heatmap and this-week/
 * today numbers, and a year-to-date window for the yearly total. GitHub
 * caps each query's range at one year.
 */
export async function fetchContributions(
  accessToken: string,
  heatmapWeeks: number,
  signal?: AbortSignal,
): Promise<NormalizedContributions> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - heatmapWeeks * 7);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [windowResult, yearResult] = await Promise.all([
    queryCalendar(accessToken, windowStart, now, signal),
    queryCalendar(accessToken, yearStart, now, signal),
  ]);

  // "Today" comes from GitHub's own last returned day, not a UTC date
  // string computed here — GitHub buckets contribution days by the
  // viewer's *profile* timezone, not UTC, so matching against
  // now.toISOString()'s UTC date could miss/misattribute "today" for
  // several hours around midnight depending on the offset between UTC
  // and the viewer's timezone. `allDays` is oldest → newest (see
  // NormalizedContributions's doc comment), so the last entry is
  // GitHub's own answer to "what day is today for this viewer."
  const allDays = windowResult.weeks.flatMap((week) => week.days);
  const totalToday = allDays[allDays.length - 1]?.count ?? 0;

  const lastWeek = windowResult.weeks[windowResult.weeks.length - 1];
  const totalThisWeek = (lastWeek?.days ?? []).reduce((sum, day) => sum + day.count, 0);

  return {
    totalToday,
    totalThisWeek,
    totalThisYear: yearResult.total,
    weeks: windowResult.weeks,
    fetchedAt: now.toISOString(),
  };
}

/**
 * Month-to-date activity counts (commits, PRs opened, repos created) from
 * the same `contributionsCollection` field the heatmap already queries —
 * its aggregate totals cover this without a separate REST /events call or
 * any new OAuth scope.
 */
export async function fetchActivitySummary(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ActivitySummary> {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: ACTIVITY_SUMMARY_QUERY,
      variables: { from: periodStart.toISOString(), to: now.toISOString() },
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const body = (await response.json()) as ActivitySummaryGraphQLResponse;
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${body.errors[0]?.message ?? "unknown"}`);
  }

  const collection = body.data?.viewer?.contributionsCollection;
  return {
    commitCount: collection?.totalCommitContributions ?? 0,
    repositoriesWithCommits: collection?.totalRepositoriesWithContributedCommits ?? 0,
    pullRequestsOpened: collection?.totalPullRequestContributions ?? 0,
    repositoriesCreated: collection?.totalRepositoryContributions ?? 0,
    periodStart: periodStart.toISOString(),
  };
}
