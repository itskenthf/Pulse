import type { ContributionWeek } from "@pulse/adapter-github";

/**
 * Current + longest streak, computed from the same daily data the heatmap
 * already renders — no extra API call. Bounded to the fetched heatmap
 * window (see constants.ts's HEATMAP_WEEKS), so "longest" reflects that
 * window, not necessarily all-time.
 */
export function computeStreaks(weeks: ContributionWeek[]): {
  current: number;
  longest: number;
} {
  const days = weeks.flatMap((week) => week.days);

  let longest = 0;
  let running = 0;
  for (const day of days) {
    if (day.count > 0) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i]!.count > 0) {
      current += 1;
    } else if (i === days.length - 1) {
      // Today having no contributions yet doesn't break a streak that's
      // still ongoing — keep looking backward from yesterday.
      continue;
    } else {
      break;
    }
  }

  return { current, longest };
}
