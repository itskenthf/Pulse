import {
  ensureWidgetRegistered,
  getTodayNutrition,
  listGoals,
  listNutritionHistory,
  type Goal,
  type NutritionLog,
} from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { HISTORY_DAYS, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { NutritionData, NutritionGoal } from "./types";

const NUTRITION_METRICS = new Set(["calories", "protein_g", "water_ml", "milk_ml"]);

/** Pure assembly, no I/O — the one place `NutritionData`'s shape is built
 *  from its three pieces, shared by both entry points below so neither
 *  duplicates the goals-filtering/history-ordering logic. */
function assembleNutritionData(today: NutritionLog, allGoals: Goal[], recentHistory: NutritionLog[]): NutritionData {
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

  return assembleNutritionData(today, allGoals, recentHistory);
}

/**
 * Same assembly as `fetchNutritionData`, but for a caller that already has
 * `today` in hand — the quick-log/correction actions get it straight back
 * from their own write's `.select()` (see @pulse/database's
 * incrementNutrition/setNutritionField), so re-reading it here would just
 * re-fetch the exact row that write just produced. Only goals/history
 * still need a real read, since a single-field write doesn't determine
 * either of those.
 */
export async function assembleNutritionDataFromToday(userId: string, today: NutritionLog): Promise<NutritionData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const [allGoals, recentHistory] = await Promise.all([
    listGoals(userId, { activeOnly: true }),
    listNutritionHistory(userId, HISTORY_DAYS),
  ]);

  return assembleNutritionData(today, allGoals, recentHistory);
}
