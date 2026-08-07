/** "3h ago" / "2d ago" — hour-level granularity, unlike Steam's
 *  day-level formatRelativeDay, since posts publish within the same day
 *  often enough that "Today" alone would be uninformative here. */
export function formatRelativeTime(publishedAt: string): string {
  const then = new Date(publishedAt).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.floor((Date.now() - then) / (1000 * 60));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
