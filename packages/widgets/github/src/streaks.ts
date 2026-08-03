import type { ContributionWeek } from "@pulse/adapter-github";

// Matches @pulse/adapter-github's REFERENCE_TIME_ZONE (and
// @pulse/widget-hero's HERO_TIME_ZONE) — duplicated as a literal rather
// than imported, since the day.date values being compared against here
// are already bucketed by GitHub's viewer-profile timezone, not UTC, so
// computing "today" via a UTC date string could exclude the real most
// recent day for several hours around midnight depending on the offset.
const REFERENCE_TIME_ZONE = "Asia/Kuching";

function todayDateString(today: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REFERENCE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(today);
}

/**
 * Current + longest streak, computed from the same daily data the heatmap
 * already renders — no extra API call. `weeks` now spans the full
 * calendar year (see @pulse/adapter-github's fetchContributions), padded
 * with zero-count days after today — those must be excluded before
 * running this, or a future day's guaranteed-zero count would look like
 * "today hasn't happened yet" no matter how far in the future it is.
 * `today` is injectable (defaults to the real current time) so this stays
 * a pure, easily-tested function rather than reaching for `new Date()`
 * internally.
 */
export function computeStreaks(
  weeks: ContributionWeek[],
  today: Date = new Date(),
): {
  current: number;
  longest: number;
} {
  const todayStr = todayDateString(today);
  const days = weeks.flatMap((week) => week.days).filter((day) => day.date <= todayStr);

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
