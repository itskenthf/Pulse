import { fetchActivitySummary, fetchContributions } from "@pulse/adapter-github";
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

  const [contributions, activitySummary] = await Promise.all([
    fetchContributions(accessToken, context.signal),
    fetchActivitySummary(accessToken, context.signal),
  ]);

  return { ...contributions, activitySummary };
}
