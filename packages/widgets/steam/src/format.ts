import { formatRelativeDay as formatRelativeDayFromEpoch } from "@pulse/health";

export function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${(minutes / 60).toFixed(1).replace(/\.0$/, "")}h`;
}

/** "2 days ago" / "Today" for a "last played" line. */
export function formatRelativeDay(unixSeconds: number): string {
  return formatRelativeDayFromEpoch(unixSeconds * 1000);
}
