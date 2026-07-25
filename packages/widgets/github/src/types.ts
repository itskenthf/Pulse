import type { LatestActivity, NormalizedContributions } from "@pulse/adapter-github";

export interface GitHubData extends NormalizedContributions {
  latestActivity: LatestActivity | null;
}
