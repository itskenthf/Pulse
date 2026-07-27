import type { MemoryEvent } from "@pulse/sdk";
import type { GitHubData } from "./types";

/**
 * Diffs against the previous cached snapshot rather than logging on every
 * fetch — see the doc comment on `Widget.deriveMemories` in @pulse/sdk for
 * why. Two signals, both cheap from data this widget already fetches:
 *
 * - The latest-commit chip changing (a new commit URL) — the most
 *   reliable "something happened" signal available.
 * - `activitySummary.repositoriesCreated` increasing — the aggregate
 *   doesn't include which repo was created, a known limitation not worth
 *   a second GraphQL query to fix in this milestone.
 */
export function deriveGitHubMemories(previous: GitHubData | null, next: GitHubData): MemoryEvent[] {
  const events: MemoryEvent[] = [];

  if (
    next.latestActivity &&
    next.latestActivity.commitUrl !== previous?.latestActivity?.commitUrl
  ) {
    events.push({
      title: `New commit in ${next.latestActivity.repoName}`,
      description: next.latestActivity.commitMessage,
      metadata: { commitUrl: next.latestActivity.commitUrl },
    });
  }

  const previousRepositoriesCreated = previous?.activitySummary?.repositoriesCreated ?? 0;
  const nextRepositoriesCreated = next.activitySummary?.repositoriesCreated ?? 0;
  if (nextRepositoriesCreated > previousRepositoriesCreated) {
    events.push({ title: "Created a new repository" });
  }

  return events;
}
