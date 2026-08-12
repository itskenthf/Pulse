import { formatRelativeDay as formatRelativeDayFromEpoch } from "@pulse/health";

/** "2 days ago" / "Today" for a latest-commit timestamp. */
export function formatRelativeDay(isoDate: string): string {
  return formatRelativeDayFromEpoch(new Date(isoDate).getTime());
}

const MONTH_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** "July 26" — for the heatmap day popover. UTC-pinned since the
 *  contribution calendar's own `date` strings are plain YYYY-MM-DD with
 *  no time component; parsing them as local time could shift the
 *  displayed day depending on the viewer's own timezone offset. */
export function formatMonthDay(isoDate: string): string {
  return MONTH_DAY_FORMATTER.format(new Date(`${isoDate}T00:00:00Z`));
}
