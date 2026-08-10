export interface MealHistoryPoint {
  loggedOn: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  snack: boolean;
}

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Meal = (typeof MEALS)[number];

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** At least this many occurrences of a weekday in the window before a
 *  skip pattern is reported — one missed Monday isn't a pattern. */
const MIN_OCCURRENCES = 2;
const MIN_SKIP_FRACTION = 0.5;

interface Candidate {
  meal: Meal;
  weekday: number;
  skipFraction: number;
}

/**
 * "You often skip breakfast on Mondays" — finds the (meal, weekday) pair
 * with the highest skip rate across the given history, among pairs seen
 * at least `MIN_OCCURRENCES` times with a skip rate of at least 50%.
 * Checks all four meals, not just breakfast, since the underlying data
 * supports it equally well.
 */
export function mealSkipPatternInsight(history: MealHistoryPoint[]): string | null {
  const candidates: Candidate[] = [];

  for (const meal of MEALS) {
    const totalsByWeekday = new Map<number, { total: number; skipped: number }>();

    for (const day of history) {
      const weekday = new Date(`${day.loggedOn}T00:00:00Z`).getUTCDay();
      const entry = totalsByWeekday.get(weekday) ?? { total: 0, skipped: 0 };
      entry.total += 1;
      if (!day[meal]) entry.skipped += 1;
      totalsByWeekday.set(weekday, entry);
    }

    for (const [weekday, { total, skipped }] of totalsByWeekday) {
      if (total < MIN_OCCURRENCES) continue;
      const skipFraction = skipped / total;
      if (skipFraction >= MIN_SKIP_FRACTION) {
        candidates.push({ meal, weekday, skipFraction });
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.skipFraction !== a.skipFraction) return b.skipFraction - a.skipFraction;
    if (a.meal !== b.meal) return MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal);
    return a.weekday - b.weekday;
  });

  const top = candidates[0]!;
  return `You often skip ${top.meal} on ${WEEKDAY_NAMES[top.weekday]}s.`;
}
