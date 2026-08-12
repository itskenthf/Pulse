import { ensureWidgetRegistered, listGoals, listMealHistory, listNutritionHistory, listWeightLogs } from "@pulse/database";
import type { GoalMetric } from "@pulse/database";
import { todayInTimeZone } from "@pulse/health";
import type { WidgetFetchContext } from "@pulse/sdk";
import {
  MAX_INSIGHTS,
  MEAL_HISTORY_DAYS,
  NUTRITION_HISTORY_DAYS,
  WEIGHT_TREND_DAYS,
  WIDGET_DESCRIPTION,
  WIDGET_ID,
  WIDGET_NAME,
} from "./constants";
import { goalAdherenceInsight, type NutritionGoalLike } from "./rules/goal-adherence";
import { mealSkipPatternInsight } from "./rules/meal-skip-pattern";
import { weightTrendInsight } from "./rules/weight-trend";
import type { InsightsData } from "./types";

const NUTRITION_METRICS: ReadonlySet<GoalMetric> = new Set(["calories", "protein_g", "water_ml", "milk_ml"]);

function isNutritionMetric(metric: GoalMetric): metric is NutritionGoalLike["metric"] {
  return NUTRITION_METRICS.has(metric);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return todayInTimeZone(date);
}

/**
 * No external API — same self-healing-backstop shape as every other
 * Body & Health widget's fetchData. No dedicated table of its own (per
 * the plan in supabase/migrations/0009's trailing comment): reads
 * directly across weight_logs/nutrition_logs/meal_checks/goals. Workout
 * data isn't available (Phase 2 excluded that module — see
 * docs/DECISIONS.md), so no workout-related rule runs here.
 */
export async function fetchInsightsData(context: WidgetFetchContext): Promise<InsightsData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const [weightLogs, mealHistory, nutritionHistory, goals] = await Promise.all([
    // 60, not WEIGHT_TREND_DAYS (30) — weight_logs has no unique-per-day
    // constraint (multiple weigh-ins on the same day are allowed, see
    // packages/database/src/weight.ts), so a row-count limit exactly equal
    // to the day window could under-fetch on a day with more than one log.
    // The 2x buffer is deliberate, not waste — see docs/DECISIONS.md's
    // 2026-08-12 entry (this was flagged as a possible one-line trim by an
    // earlier perf pass, investigated, and kept as-is).
    listWeightLogs(context.userId, 60),
    listMealHistory(context.userId, MEAL_HISTORY_DAYS),
    listNutritionHistory(context.userId, NUTRITION_HISTORY_DAYS),
    listGoals(context.userId, { activeOnly: true }),
  ]);

  const cutoff = daysAgo(WEIGHT_TREND_DAYS);
  const recentWeightLogs = weightLogs.filter((log) => log.loggedOn >= cutoff);

  const nutritionGoalRow = goals.find((goal) => isNutritionMetric(goal.metric));
  const nutritionGoal: NutritionGoalLike | null = nutritionGoalRow
    ? {
        metric: nutritionGoalRow.metric as NutritionGoalLike["metric"],
        targetValue: nutritionGoalRow.targetValue,
        comparator: nutritionGoalRow.comparator,
      }
    : null;

  const insights = [
    weightTrendInsight(recentWeightLogs),
    mealSkipPatternInsight(mealHistory),
    goalAdherenceInsight(nutritionHistory, nutritionGoal),
  ]
    .filter((insight): insight is string => insight !== null)
    .slice(0, MAX_INSIGHTS);

  return { insights, fetchedAt: new Date().toISOString() };
}
