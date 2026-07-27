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
    latestActivity: null,
    activitySummary: null,
    ...overrides,
  };
}

describe("deriveGitHubMemories", () => {
  it("returns nothing when there's no previous data and nothing to report", () => {
    expect(deriveGitHubMemories(null, data())).toEqual([]);
  });

  it("emits a memory when the latest commit changes", () => {
    const previous = data({
      latestActivity: {
        repoName: "Pulse",
        repoUrl: "https://github.com/itskenthf/Pulse",
        commitMessage: "Old commit",
        commitUrl: "https://github.com/itskenthf/Pulse/commit/aaa",
        committedAt: "2026-07-26T00:00:00Z",
      },
    });
    const next = data({
      latestActivity: {
        repoName: "Pulse",
        repoUrl: "https://github.com/itskenthf/Pulse",
        commitMessage: "New commit",
        commitUrl: "https://github.com/itskenthf/Pulse/commit/bbb",
        committedAt: "2026-07-27T00:00:00Z",
      },
    });

    expect(deriveGitHubMemories(previous, next)).toEqual([
      {
        title: "New commit in Pulse",
        description: "New commit",
        metadata: { commitUrl: "https://github.com/itskenthf/Pulse/commit/bbb" },
      },
    ]);
  });

  it("does not emit a memory when the latest commit is unchanged", () => {
    const activity = {
      repoName: "Pulse",
      repoUrl: "https://github.com/itskenthf/Pulse",
      commitMessage: "Same commit",
      commitUrl: "https://github.com/itskenthf/Pulse/commit/aaa",
      committedAt: "2026-07-26T00:00:00Z",
    };

    expect(deriveGitHubMemories(data({ latestActivity: activity }), data({ latestActivity: activity }))).toEqual(
      [],
    );
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
});
