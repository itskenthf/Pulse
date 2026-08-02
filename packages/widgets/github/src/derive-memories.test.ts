import { describe, expect, it } from "vitest";
import { deriveGitHubMemories } from "./derive-memories";
import type { GitHubData } from "./types";

function data(overrides: Partial<GitHubData> = {}): GitHubData {
  return {
    totalToday: 0,
    totalThisWeek: 0,
    totalThisYear: 0,
    weeks: [],
    fetchedAt: "2026-07-27T00:00:00Z",
    activitySummary: null,
    recentPullRequests: [],
    ...overrides,
  };
}

describe("deriveGitHubMemories", () => {
  it("returns nothing when there's no previous data and nothing to report", () => {
    expect(deriveGitHubMemories(null, data())).toEqual([]);
  });

  it("emits a memory when repositoriesCreated increases", () => {
    const previous = data({
      activitySummary: {
        commitCount: 5,
        repositoriesWithCommits: 1,
        pullRequestsOpened: 0,
        repositoriesCreated: 1,
        periodStart: "2026-07-01T00:00:00Z",
      },
    });
    const next = data({
      activitySummary: {
        commitCount: 6,
        repositoriesWithCommits: 1,
        pullRequestsOpened: 0,
        repositoriesCreated: 2,
        periodStart: "2026-07-01T00:00:00Z",
      },
    });

    expect(deriveGitHubMemories(previous, next)).toEqual([{ title: "Created a new repository" }]);
  });

  it("does not emit a memory when repositoriesCreated is unchanged", () => {
    const summary = {
      commitCount: 5,
      repositoriesWithCommits: 1,
      pullRequestsOpened: 0,
      repositoriesCreated: 1,
      periodStart: "2026-07-01T00:00:00Z",
    };

    expect(
      deriveGitHubMemories(data({ activitySummary: summary }), data({ activitySummary: summary })),
    ).toEqual([]);
  });

  const pr = {
    id: "pr_1",
    number: 42,
    title: "Regroup dashboard widget grid",
    url: "https://github.com/itskenthf/Pulse/pull/42",
    repository: "itskenthf/Pulse",
    merged: false,
  };

  it("emits an 'Opened' memory for a PR not seen in the previous snapshot", () => {
    const events = deriveGitHubMemories(data(), data({ recentPullRequests: [pr] }));

    expect(events).toEqual([
      {
        title: "Opened PR #42: Regroup dashboard widget grid",
        description: "itskenthf/Pulse",
        metadata: { url: pr.url, repository: pr.repository, number: 42 },
      },
    ]);
  });

  it("emits a 'Merged' memory when an already-seen PR's merged flag flips to true", () => {
    const previous = data({ recentPullRequests: [pr] });
    const next = data({ recentPullRequests: [{ ...pr, merged: true }] });

    expect(deriveGitHubMemories(previous, next)).toEqual([
      {
        title: "Merged PR #42: Regroup dashboard widget grid",
        description: "itskenthf/Pulse",
        metadata: { url: pr.url, repository: pr.repository, number: 42 },
      },
    ]);
  });

  it("emits nothing for a PR unchanged between polls", () => {
    const previous = data({ recentPullRequests: [pr] });
    const next = data({ recentPullRequests: [pr] });

    expect(deriveGitHubMemories(previous, next)).toEqual([]);
  });

  it("emits nothing extra for a PR that was already merged the first time it's seen", () => {
    const events = deriveGitHubMemories(data(), data({ recentPullRequests: [{ ...pr, merged: true }] }));

    expect(events).toEqual([
      {
        title: "Opened PR #42: Regroup dashboard widget grid",
        description: "itskenthf/Pulse",
        metadata: { url: pr.url, repository: pr.repository, number: 42 },
      },
    ]);
  });

  it("treats every PR as new on cold start (previous.recentPullRequests missing)", () => {
    const events = deriveGitHubMemories(null, data({ recentPullRequests: [pr] }));

    expect(events).toEqual([
      {
        title: "Opened PR #42: Regroup dashboard widget grid",
        description: "itskenthf/Pulse",
        metadata: { url: pr.url, repository: pr.repository, number: 42 },
      },
    ]);
  });
});
