export interface NutritionHistoryPoint {
  loggedOn: string;
  calories: number;
  proteinG: number;
  waterMl: number;
  milkMl: number;
}

export interface NutritionGoalLike {
  metric: "calories" | "protein_g" | "water_ml" | "milk_ml";
  targetValue: number;
  comparator: "at_least" | "at_most" | "exactly";
}

const METRIC_LABELS: Record<NutritionGoalLike["metric"], string> = {
  calories: "calorie",
  protein_g: "protein",
  water_ml: "water",
  milk_ml: "milk",
};

const VALUE_BY_METRIC: Record<NutritionGoalLike["metric"], (day: NutritionHistoryPoint) => number> = {
  calories: (day) => day.calories,
  protein_g: (day) => day.proteinG,
  water_ml: (day) => day.waterMl,
  milk_ml: (day) => day.milkMl,
};

function isMet(value: number, goal: NutritionGoalLike): boolean {
  switch (goal.comparator) {
    case "at_least":
      return value >= goal.targetValue;
    case "at_most":
      return value <= goal.targetValue;
    case "exactly":
      return value === goal.targetValue;
  }
}

/**
 * "You've hit your water goal 5 of the last 7 days" — only reported when
 * an active goal exists for that metric (no goal, no claim) and there's
 * at least one day of history to measure against.
 */
export function goalAdherenceInsight(
  history: NutritionHistoryPoint[],
  goal: NutritionGoalLike | null,
): string | null {
  if (!goal || history.length === 0) return null;

  const valueOf = VALUE_BY_METRIC[goal.metric];
  const metDays = history.filter((day) => isMet(valueOf(day), goal)).length;

  return `You've hit your ${METRIC_LABELS[goal.metric]} goal ${metDays} of the last ${history.length} days.`;
}
