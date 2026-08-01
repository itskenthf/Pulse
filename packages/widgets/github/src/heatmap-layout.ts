import type { ContributionWeek } from "@pulse/adapter-github";

export interface MonthLabel {
  /** Index into `weeks` — the column this label sits above. */
  weekIndex: number;
  label: string;
}

const MONTH_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

/**
 * Which week-column each month's 1st day falls in, for rendering a label
 * row above the heatmap grid. `weeks` comes straight from
 * @pulse/adapter-github's `fetchContributions`, which GitHub pads to
 * Sunday-aligned week boundaries — the first week can include up to 6
 * days from the previous December, and the last week up to 6 days from
 * the following January. `year` scopes month-transition detection to the
 * calendar year actually being displayed, so that trailing padding into
 * next January doesn't produce a spurious extra "Jan" label at the very
 * end (leading padding into previous December can never do this: it's
 * at most 6 days, never reaching a "1st of the month").
 */
export function computeMonthLabels(weeks: ContributionWeek[], year: number): MonthLabel[] {
  const labels: MonthLabel[] = [];
  const yearPrefix = String(year);
  let lastMonth: string | null = null;

  weeks.forEach((week, weekIndex) => {
    for (const day of week.days) {
      if (!day.date.startsWith(yearPrefix)) continue;

      const month = day.date.slice(0, 7); // YYYY-MM
      const dayOfMonth = day.date.slice(8, 10);
      if (dayOfMonth === "01" && month !== lastMonth) {
        labels.push({ weekIndex, label: MONTH_FORMATTER.format(new Date(`${day.date}T00:00:00Z`)) });
        lastMonth = month;
        break;
      }
    }
  });

  return labels;
}

/**
 * The most recent `count` weeks *relative to today*, not the last
 * `count` entries of the raw array. `weeks` is the full Jan 1–Dec 31
 * year from `fetchContributions`, which GitHub pads with days *after
 * today* at count/level 0 all the way through Dec 31 — a plain
 * `weeks.slice(-count)` would grab the tail of the calendar year
 * (November/December, all future padding) instead of the weeks actually
 * leading up to today whenever today isn't late in the year. Filtering
 * to weeks containing at least one past-or-today day before slicing
 * fixes that.
 */
export function selectRecentWeeks(
  weeks: ContributionWeek[],
  fetchedAt: string,
  count: number,
): ContributionWeek[] {
  const todayStr = fetchedAt.slice(0, 10);
  const pastOrTodayWeeks = weeks.filter((week) => week.days.some((day) => day.date <= todayStr));
  return pastOrTodayWeeks.slice(-count);
}
