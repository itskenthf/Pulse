// Matches @pulse/widget-hero's HERO_TIME_ZONE — duplicated as a literal
// rather than imported, since adapters sit below widgets in the
// dependency graph. Used only to compute "today" much closer to this
// single-user app's real-world timezone than UTC would be; see
// todayDateString's call site below for why this matters.
const REFERENCE_TIME_ZONE = "Asia/Kuching";

function todayDateString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REFERENCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

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

export interface PullRequestSummary {
  id: string;
  number: number;
  title: string;
  url: string;
  /** "owner/name", e.g. "octocat/example-repo". */
  repository: string;
  merged: boolean;
}

interface PullRequestGraphQLResponse {
  data?: {
    viewer?: {
      contributionsCollection?: {
        pullRequestContributions?: {
          nodes?: {
            pullRequest?: {
              id?: string;
              number?: number;
              title?: string;
              url?: string;
              merged?: boolean;
              repository?: { nameWithOwner?: string };
            };
          }[];
        };
      };
    };
  };
  errors?: { message?: string }[];
}

const PULL_REQUESTS_QUERY = `
  query($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
        pullRequestContributions(first: 50) {
          nodes {
            pullRequest {
              id
              number
              title
              url
              merged
              repository {
                nameWithOwner
              }
            }
          }
        }
      }
    }
  }
`;

/** How far back to look for PRs to track (see fetchRecentPullRequests'
 *  own doc comment for why this can't just be month-to-date). */
const PULL_REQUEST_WINDOW_DAYS = 90;

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
  // timezone, not UTC, so matching against a UTC date could miss/
  // misattribute "today" for several hours around midnight depending on
  // the offset (e.g. UTC+8 still shows "yesterday" in UTC for the first
  // 8 hours of the local day). `todayDateString` uses the same reference
  // timezone as the rest of Pulse (see @pulse/widget-hero's
  // HERO_TIME_ZONE) instead, which is much closer to a real GitHub
  // profile's offset than UTC for this single-user app. `allDays` now
  // runs through Dec 31 (future days included as zero-count
  // placeholders), so the real "today" is the last entry whose date
  // isn't in the future, not simply the array's last element.
  const todayStr = todayDateString(now);
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

/**
 * Individual PRs (title, repo, merged status) rather than just a count —
 * feeds the Timeline's per-PR "opened"/"merged" memory events
 * (packages/widgets/github/src/derive-memories.ts), which a plain count
 * can't support. Windowed on a trailing 90 days from now, not calendar
 * month-to-date like fetchActivitySummary: a PR's "contribution" date is
 * when it was *opened*, so a month-to-date window would silently miss a
 * merge event for a PR opened in a prior month whose merged status just
 * changed.
 *
 * `pullRequestContributions` is new territory for this codebase — every
 * other query here only ever needed aggregate counts specifically to
 * avoid requiring more OAuth scope than `read:user` (see docs/DECISIONS.md,
 * 2026-07-22). Whether GitHub exposes PR title/repo/merged-state under
 * that same scope for this endpoint hasn't been verified against a live
 * token from within this codebase before — the caller
 * (packages/widgets/github/src/fetch.ts) isolates failures from this
 * function specifically so a scope/permission error here can't break the
 * rest of the widget.
 */
export async function fetchRecentPullRequests(
  accessToken: string,
  signal?: AbortSignal,
): Promise<PullRequestSummary[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - PULL_REQUEST_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: PULL_REQUESTS_QUERY,
      variables: { from: windowStart.toISOString(), to: now.toISOString() },
    }),
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed: ${response.status}`);
  }

  const body = (await response.json()) as PullRequestGraphQLResponse;
  if (body.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${body.errors[0]?.message ?? "unknown"}`);
  }

  const nodes = body.data?.viewer?.contributionsCollection?.pullRequestContributions?.nodes ?? [];

  const summaries: PullRequestSummary[] = [];
  for (const node of nodes) {
    const pr = node.pullRequest;
    const repository = pr?.repository?.nameWithOwner;
    if (!pr?.id || !pr.title || !pr.url || !repository) continue;
    summaries.push({
      id: pr.id,
      number: pr.number ?? 0,
      title: pr.title,
      url: pr.url,
      repository,
      merged: pr.merged ?? false,
    });
  }
  return summaries;
}
