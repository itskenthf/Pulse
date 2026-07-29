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
  /** Oldest → newest, the full calendar year (Jan 1–Dec 31 UTC). Days
   *  after today are included with count 0 / level 0 — GitHub returns
   *  these directly rather than Pulse needing to pad the array itself. */
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
 * A single calendar query spanning the whole current year (Jan 1–Dec 31
 * UTC) supplies everything: the full heatmap, the yearly total, and (by
 * inspecting the data itself) today/this-week — no separate windowed
 * query needed. This used to be two parallel queries (a trailing window
 * for the heatmap/today/this-week, plus a year-to-date query whose
 * per-day data was discarded and only its total kept) — one full-year
 * query removes a whole request/response round trip and GitHub API
 * rate-limit unit per refresh, on top of also being the data a full-year
 * heatmap needs. GitHub caps a single query's range at one year, which a
 * calendar year fits exactly.
 */
export async function fetchContributions(
  accessToken: string,
  signal?: AbortSignal,
): Promise<NormalizedContributions> {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));

  const yearResult = await queryCalendar(accessToken, yearStart, yearEnd, signal);
  const allDays = yearResult.weeks.flatMap((week) => week.days);

  // "Today" comes from GitHub's own data, not a UTC date string computed
  // here — GitHub buckets contribution days by the viewer's *profile*
  // timezone, not UTC, so matching against now.toISOString()'s UTC date
  // could miss/misattribute "today" for several hours around midnight
  // depending on the offset. `allDays` now runs through Dec 31 (future
  // days included as zero-count placeholders), so the real "today" is
  // the last entry whose date isn't in the future, not simply the
  // array's last element.
  const todayStr = now.toISOString().slice(0, 10);
  const pastOrTodayDays = allDays.filter((day) => day.date <= todayStr);
  const totalToday = pastOrTodayDays.at(-1)?.count ?? 0;

  const todayDate = pastOrTodayDays.at(-1)?.date;
  const currentWeek = yearResult.weeks.find((week) =>
    week.days.some((day) => day.date === todayDate),
  );
  const totalThisWeek = (currentWeek?.days ?? []).reduce((sum, day) => sum + day.count, 0);

  return {
    totalToday,
    totalThisWeek,
    totalThisYear: yearResult.total,
    weeks: yearResult.weeks,
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
