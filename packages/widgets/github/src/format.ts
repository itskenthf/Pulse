/** "2 days ago" / "Today" — coarse, day-level granularity is enough for a
 *  latest-commit timestamp; no need for exact hours/minutes precision. */
export function formatRelativeDay(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
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
