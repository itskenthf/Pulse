import { ensureWidgetRegistered, getTodayNutrition, listGoals, listNutritionHistory } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { HISTORY_DAYS, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { NutritionData, NutritionGoal } from "./types";

const NUTRITION_METRICS = new Set(["calories", "protein_g", "water_ml", "milk_ml"]);

/** No external API — same self-healing-backstop shape as Tasks/Weight's
 *  fetchData. Write actions call `refreshWidget` right after every tap for
 *  an instant dashboard update. */
export async function fetchNutritionData(context: WidgetFetchContext): Promise<NutritionData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const [today, allGoals, recentHistory] = await Promise.all([
    getTodayNutrition(context.userId),
    listGoals(context.userId, { activeOnly: true }),
    listNutritionHistory(context.userId, HISTORY_DAYS),
  ]);

  const goals: NutritionGoal[] = allGoals
    .filter((goal) => NUTRITION_METRICS.has(goal.metric))
    .map((goal) => ({
      id: goal.id,
      title: goal.title,
      metric: goal.metric as NutritionGoal["metric"],
      targetValue: goal.targetValue,
      comparator: goal.comparator,
    }));

  return {
    today: {
      loggedOn: today.loggedOn,
      calories: today.calories,
      proteinG: today.proteinG,
      waterMl: today.waterMl,
      milkMl: today.milkMl,
    },
    goals,
    // listNutritionHistory returns newest-first; the sparkline reads left
    // (oldest) to right (newest), same convention as Weight's chronological
    // reverse of its own newest-first log list.
    history: [...recentHistory].reverse().map((day) => ({ loggedOn: day.loggedOn, calories: day.calories })),
    fetchedAt: new Date().toISOString(),
  };
}
