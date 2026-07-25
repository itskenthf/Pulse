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
