export type GoalComparator = "at_least" | "at_most" | "exactly";

/** Is `current` meeting `target` under `comparator`? Pure comparison —
 *  callers supply `current` already read from the relevant log table
 *  (weight_logs/nutrition_logs/meal_checks); this has no DB knowledge of
 *  its own. */
export function isGoalMet(current: number, target: number, comparator: GoalComparator): boolean {
  switch (comparator) {
    case "at_least":
      return current >= target;
    case "at_most":
      return current <= target;
    case "exactly":
      return current === target;
  }
}
