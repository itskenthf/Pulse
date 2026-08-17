import type { MemoryEvent } from "@pulse/sdk";
import type { MealsData } from "./types";

const MEAL_LABELS = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack: "a snack",
} as const;

/**
 * Only a false→true check-off is memory-worthy, matching Tasks' "only
 * completions are memory-worthy" diffing pattern. Only diffs when
 * `loggedOn` matches the previous snapshot — a new day resets every meal
 * to unchecked, and that reset itself isn't a real transition to log. See
 * the doc comment on `Widget.deriveMemories` in @pulse/sdk for why this
 * diffs against the previous snapshot rather than firing on every fetch.
 */
export function deriveMealsMemories(previous: MealsData | null, next: MealsData): MemoryEvent[] {
  if (!previous || previous.today.loggedOn !== next.today.loggedOn) return [];

  return (Object.keys(MEAL_LABELS) as (keyof typeof MEAL_LABELS)[])
    .filter((meal) => next.today[meal] && !previous.today[meal])
    .map((meal) => ({ title: `Checked off ${MEAL_LABELS[meal]}` }));
}
