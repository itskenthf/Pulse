import { fetchContributions, fetchLatestActivity } from "@pulse/adapter-github";
import { ensureWidgetRegistered, readProviderAccessToken } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { HEATMAP_WEEKS, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { GitHubData } from "./types";

export async function fetchGitHubData(context: WidgetFetchContext): Promise<GitHubData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const accessToken = await readProviderAccessToken(context.userId, "github");
  if (!accessToken) {
    throw new Error("No GitHub account linked — sign in with GitHub first");
  }

  const [contributions, latestActivity] = await Promise.all([
    fetchContributions(accessToken, HEATMAP_WEEKS, context.signal),
    fetchLatestActivity(accessToken, context.signal),
  ]);

  return { ...contributions, latestActivity };
}
