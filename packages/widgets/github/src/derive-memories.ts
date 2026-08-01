import type { MemoryEvent } from "@pulse/sdk";
import type { GitHubData } from "./types";

/**
 * Diffs against the previous cached snapshot rather than logging on every
 * fetch — see the doc comment on `Widget.deriveMemories` in @pulse/sdk for
 * why. One signal, cheap from data this widget already fetches:
 *
 * - `activitySummary.repositoriesCreated` increasing — the aggregate
 *   doesn't include which repo was created, a known limitation not worth
 *   a second GraphQL query to fix in this milestone.
 *
 * A second signal (new commit, via the "latest repo/commit" card row) was
 * dropped along with that row when it was removed for cluttering the
 * card — see docs/DECISIONS.md.
 */
export function deriveGitHubMemories(previous: GitHubData | null, next: GitHubData): MemoryEvent[] {
  const events: MemoryEvent[] = [];

  const previousRepositoriesCreated = previous?.activitySummary?.repositoriesCreated ?? 0;
  const nextRepositoriesCreated = next.activitySummary?.repositoriesCreated ?? 0;
  if (nextRepositoriesCreated > previousRepositoriesCreated) {
    events.push({ title: "Created a new repository" });
  }

  return events;
}
