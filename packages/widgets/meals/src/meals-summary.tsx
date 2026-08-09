import { ProgressBar } from "@pulse/ui";
import type { MealsToday } from "./types";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

/** An at-a-glance "N of 4 meals" line above the individual checkmarks —
 *  the checkmarks stay the source of truth for which specific meal is
 *  done, this is just a quick summary read. */
export function MealsSummary({ today }: { today: MealsToday }) {
  const checked = MEALS.filter((meal) => today[meal]).length;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--color-neutral-500)]">{checked} / 4 meals today</span>
      <ProgressBar percent={(checked / MEALS.length) * 100} label={`${checked} of 4 meals today`} />
    </div>
  );
}
