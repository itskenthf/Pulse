/** Matches Hero's own HERO_TIME_ZONE (packages/widgets/hero/src/constants.ts)
 *  — the server runs in UTC, but "today"/"this week" are user-local
 *  concepts. Single-user app, so a shared constant rather than a per-user
 *  setting is the appropriate scope here. */
const TIME_ZONE = "Asia/Kuching";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** "YYYY-MM-DD" for the given instant (defaults to now) in the user's own
 *  time zone — the calendar date nutrition/meals/weight logs key off.
 *  Reuses one hoisted `Intl.DateTimeFormat` rather than constructing a new
 *  one per call — daily-digest calls this once per memory in a lookback
 *  window of up to 200 (see docs/DECISIONS.md's 2026-08-12 entry), and
 *  every other caller benefits too, for free. */
export function todayInTimeZone(date: Date = new Date()): string {
  return DAY_FORMATTER.format(date);
}

/** ISO 8601 week label ("2026-W32") for a "YYYY-MM-DD" date string — used
 *  to group weight logs into one card per week without a DB-level
 *  uniqueness constraint (see supabase/migrations/0009's weight_logs
 *  comment for why that constraint was deliberately not added). */
export function isoWeekKey(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const target = new Date(date.getTime());
  const dayNumber = (date.getUTCDay() + 6) % 7; // Monday = 0
  target.setUTCDate(target.getUTCDate() - dayNumber + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" for the Monday of the ISO week containing the given
 *  instant (defaults to now), in the user's own time zone — the
 *  `week_of` value Weekly Review keys off. */
export function currentWeekStart(date: Date = new Date()): string {
  const today = new Date(`${todayInTimeZone(date)}T00:00:00Z`);
  const dayNumber = (today.getUTCDay() + 6) % 7; // Monday = 0
  today.setUTCDate(today.getUTCDate() - dayNumber);
  return today.toISOString().slice(0, 10);
}

/** Is it Sunday right now, in the user's own time zone? Weekly Review's
 *  dashboard card only nudges on Sundays, and only if that week's review
 *  isn't filled in yet — this is the "is it Sunday" half of that check. */
export function isSundayInTimeZone(date: Date = new Date()): boolean {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date) === "Sun";
}

/** "2 days ago" / "Today" — coarse, day-level granularity, used for
 *  "latest activity" timestamps (a commit, a last-played session) across
 *  widgets; exact hours/minutes precision isn't needed for these. Takes
 *  an epoch-milliseconds instant so callers with an ISO string or Unix
 *  seconds convert once at the call site rather than this function
 *  guessing their input's units. */
export function formatRelativeDay(epochMs: number): string {
  const days = Math.floor((Date.now() - epochMs) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
