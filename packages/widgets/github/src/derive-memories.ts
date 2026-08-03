import type { MemoryEvent } from "@pulse/sdk";
import type { GitHubData } from "./types";

/**
 * Diffs against the previous cached snapshot rather than logging on every
 * fetch — see the doc comment on `Widget.deriveMemories` in @pulse/sdk for
 * why. Signals, all cheap from data this widget already fetches:
 *
 * - `activitySummary.repositoriesCreated` increasing — the aggregate
 *   doesn't include which repo was created, a known limitation not worth
 *   a second GraphQL query to fix in this milestone. It's a *month-to-date*
 *   counter (see `periodStart`), so a plain previous/next comparison
 *   would false-negative right after a month boundary — e.g. 4 repos
 *   created in July, 1 so far in August, `1 > 4` is false even though a
 *   real new repo was just created. `periodStart` changing is treated as
 *   the counter having reset to 0, not compared against last month's
 *   stale total.
 * - `recentPullRequests` diffed by id (same `Map`-of-previous-items idiom
 *   as Steam's `deriveSteamMemories`, and the `Set`-of-previous-ids idiom
 *   Tasks/Notes/Notebook use for their own list diffs): a PR id absent
 *   from the previous snapshot is newly opened; a PR present in both
 *   snapshots whose `merged` flipped false→true just got merged. No
 *   event for a PR that's unchanged between polls, or a merge on a PR
 *   this snapshot never saw open (its `merged` was already `true` the
 *   first time it appeared — that's captured as a single "Opened" event
 *   below, not two).
 *
 * A second commit-count signal (via the "latest repo/commit" card row)
 * was dropped along with that row when it was removed for cluttering the
 * card — see docs/DECISIONS.md.
 */
export function deriveGitHubMemories(previous: GitHubData | null, next: GitHubData): MemoryEvent[] {
  const events: MemoryEvent[] = [];

  const monthChanged =
    previous?.activitySummary != null &&
    previous.activitySummary.periodStart !== next.activitySummary?.periodStart;
  const previousRepositoriesCreated = monthChanged
    ? 0
    : (previous?.activitySummary?.repositoriesCreated ?? 0);
  const nextRepositoriesCreated = next.activitySummary?.repositoriesCreated ?? 0;
  if (nextRepositoriesCreated > previousRepositoriesCreated) {
    events.push({ title: "Created a new repository" });
  }

  const previousPullRequests = new Map(
    (previous?.recentPullRequests ?? []).map((pr) => [pr.id, pr]),
  );

  for (const pr of next.recentPullRequests) {
    const previousPr = previousPullRequests.get(pr.id);

    if (!previousPr) {
      events.push({
        title: `Opened PR #${pr.number}: ${pr.title}`,
        description: pr.repository,
        metadata: { url: pr.url, repository: pr.repository, number: pr.number },
      });
      continue;
    }

    if (pr.merged && !previousPr.merged) {
      events.push({
        title: `Merged PR #${pr.number}: ${pr.title}`,
        description: pr.repository,
        metadata: { url: pr.url, repository: pr.repository, number: pr.number },
      });
    }
  }

  return events;
}
