import { describe, expect, it } from "vitest";
import { githubDataSchema } from "./types";

const validData = {
  totalToday: 3,
  totalThisWeek: 12,
  totalThisYear: 400,
  weeks: [{ days: [{ date: "2026-07-27", count: 3, level: 2 }] }],
  fetchedAt: "2026-07-27T00:00:00Z",
  latestActivity: {
    repoName: "pulse",
    repoUrl: "https://github.com/itskenthf/Pulse",
    commitMessage: "Fix a thing",
    commitUrl: "https://github.com/itskenthf/Pulse/commit/abc",
    committedAt: "2026-07-27T00:00:00Z",
  },
  activitySummary: {
    commitCount: 85,
    repositoriesWithCommits: 4,
    pullRequestsOpened: 12,
    repositoriesCreated: 2,
    periodStart: "2026-07-01T00:00:00.000Z",
  },
};

describe("githubDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(githubDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts a null latestActivity (no matching repo found)", () => {
    const result = githubDataSchema.safeParse({ ...validData, latestActivity: null });
    expect(result.success).toBe(true);
  });

  it("accepts a null activitySummary", () => {
    const result = githubDataSchema.safeParse({ ...validData, activitySummary: null });
    expect(result.success).toBe(true);
  });

  it("rejects a row missing a required field", () => {
    const { totalToday: _totalToday, ...withoutTotalToday } = validData;
    expect(githubDataSchema.safeParse(withoutTotalToday).success).toBe(false);
  });

  it("rejects a row where a field's type has drifted (the exact bug this guards against)", () => {
    const result = githubDataSchema.safeParse({ ...validData, totalToday: "3" });
    expect(result.success).toBe(false);
  });
});
