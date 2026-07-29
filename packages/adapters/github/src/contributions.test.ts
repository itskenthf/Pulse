import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContributions } from "./contributions";

const LEVEL_NAMES = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

/** Builds a full calendar year of GraphQL contributionDays (Jan 1–Dec 31),
 *  with `countsByDate` overriding specific days and everything else at 0
 *  — mirroring what GitHub actually returns for days that haven't
 *  happened yet (zero, not omitted). Grouped into 7-day weeks so the
 *  shape matches the real API. */
function buildYearResponse(year: number, countsByDate: Record<string, number> = {}) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  const days: { date: string; contributionCount: number; contributionLevel: string }[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const count = countsByDate[date] ?? 0;
    days.push({
      date,
      contributionCount: count,
      contributionLevel: LEVEL_NAMES[Math.min(count, 4)]!,
    });
  }

  const weeks: { contributionDays: typeof days }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ contributionDays: days.slice(i, i + 7) });
  }

  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
  return { weeks, total };
}

function mockFetchResponse(weeks: unknown, total: number) {
  return {
    ok: true,
    json: async () => ({
      data: {
        viewer: {
          contributionsCollection: {
            contributionCalendar: { totalContributions: total, weeks },
          },
        },
      },
    }),
  };
}

describe("fetchContributions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fires exactly one GraphQL request — regression guard against reintroducing the second (discarded) query", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    const { weeks, total } = buildYearResponse(2026, { "2026-07-29": 3 });
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFetchResponse(weeks, total));
    vi.stubGlobal("fetch", fetchMock);

    await fetchContributions("token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("queries the full calendar year (Jan 1 - Dec 31 UTC), not a trailing window", async () => {
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const { weeks, total } = buildYearResponse(2026);
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFetchResponse(weeks, total));
    vi.stubGlobal("fetch", fetchMock);

    await fetchContributions("token");

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.variables.from).toBe(new Date(Date.UTC(2026, 0, 1)).toISOString());
    expect(body.variables.to).toBe(new Date(Date.UTC(2026, 11, 31, 23, 59, 59)).toISOString());
  });

  it("derives totalToday/totalThisWeek from the real 'today', not the array's last (future) entry", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    const { weeks, total } = buildYearResponse(2026, {
      "2026-07-27": 2,
      "2026-07-28": 1,
      "2026-07-29": 5, // today
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFetchResponse(weeks, total));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchContributions("token");

    expect(result.totalToday).toBe(5);
    // Whichever week-column contains 2026-07-29 also contains 07-27 and
    // 07-28's counts (same Sun-Sat week), so this-week sums all three.
    expect(result.totalThisWeek).toBe(2 + 1 + 5);
    expect(result.totalThisYear).toBe(total);
  });

  it("returns the full year of weeks, including trailing future zero-count days", async () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const { weeks, total } = buildYearResponse(2026, { "2026-01-15": 4 });
    const fetchMock = vi.fn().mockResolvedValueOnce(mockFetchResponse(weeks, total));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchContributions("token");

    const allDays = result.weeks.flatMap((w) => w.days);
    expect(allDays.some((d) => d.date === "2026-12-31")).toBe(true);
    const december31 = allDays.find((d) => d.date === "2026-12-31");
    expect(december31?.count).toBe(0);
  });

  it("throws a descriptive error when the request itself fails", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 502 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchContributions("token")).rejects.toThrow("GitHub GraphQL request failed: 502");
  });
});
