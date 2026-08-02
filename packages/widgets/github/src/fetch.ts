import {
  fetchActivitySummary,
  fetchContributions,
  fetchRecentPullRequests,
} from "@pulse/adapter-github";
import { ensureWidgetRegistered, readProviderAccessToken } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { GitHubData } from "./types";

export async function fetchGitHubData(context: WidgetFetchContext): Promise<GitHubData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const accessToken = await readProviderAccessToken(context.userId, "github");
  if (!accessToken) {
    throw new Error("No GitHub account linked — sign in with GitHub first");
  }

  const [contributions, activitySummary, recentPullRequests] = await Promise.all([
    fetchContributions(accessToken, context.signal),
    fetchActivitySummary(accessToken, context.signal),
    // Isolated: `pullRequestContributions` is new territory for this
    // codebase (see fetchRecentPullRequests' own doc comment) — a
    // permission/scope error here degrades to no PR memories rather than
    // failing the whole widget's refresh (stale heatmap/counts for every
    // other user too, since this all runs on one shared cron tick).
    fetchRecentPullRequests(accessToken, context.signal).catch((err: unknown) => {
      console.error("Failed to fetch GitHub pull requests:", err);
      return [];
    }),
  ]);

  return { ...contributions, activitySummary, recentPullRequests };
}
