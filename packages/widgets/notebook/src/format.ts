const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "This morning" / "Yesterday" / "Two days ago" / an actual date beyond
 *  that — day-level granularity, matching the spec's exact label set
 *  rather than a finer-grained scheme. Local time, since this is about
 *  how the entry's day reads to the person who wrote it, not a
 *  timezone-neutral timestamp. */
export function formatRelativeDayLabel(isoDate: string, now: Date = new Date()): string {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEntryDay = (() => {
    const d = new Date(isoDate);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const days = Math.round((startOfToday.getTime() - startOfEntryDay.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "This morning";
  if (days === 1) return "Yesterday";
  if (days === 2) return "Two days ago";
  return DATE_FORMATTER.format(startOfEntryDay);
}

/** A single subtle added-time timestamp per entry. No "edited" state:
 *  entries have no edit UI — the only way `updatedAt` ever differs
 *  from `createdAt` is the autosave upsert re-saving the same still-
 *  open draft while the user keeps typing, which isn't something a
 *  person would perceive as "editing" a past entry, so it isn't
 *  surfaced. Absolute time, so (unlike `formatRelativeDayLabel`)
 *  there's no `now` to compare against. */
export function formatEntryTimestamp(isoDate: string): string {
  return TIMESTAMP_FORMATTER.format(new Date(isoDate));
}

/** Newest entry reads at full strength, then steps down as entries
 *  recede — "gives the sense of pages turned without extra chrome." */
export function opacityForIndex(index: number): number {
  if (index === 0) return 1;
  if (index === 1) return 0.75;
  return 0.5;
}
