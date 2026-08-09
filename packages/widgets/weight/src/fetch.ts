import { ensureWidgetRegistered, listGoals, listWeightLogs } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { RECENT_LOG_LIMIT, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { WeightData } from "./types";

/** No external API — same self-healing-backstop shape as Tasks/Reading's
 *  fetchData. Write actions in apps/web/src/app/actions/weight.ts call
 *  `refreshWidget` right after every write for an instant dashboard update. */
export async function fetchWeightData(context: WidgetFetchContext): Promise<WeightData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const [logs, goals] = await Promise.all([
    listWeightLogs(context.userId, RECENT_LOG_LIMIT),
    listGoals(context.userId, { activeOnly: true, metric: "weight_kg" }),
  ]);
  const goal = goals[0] ?? null;

  return {
    logs,
    goal: goal
      ? { id: goal.id, title: goal.title, targetValue: goal.targetValue, comparator: goal.comparator }
      : null,
    fetchedAt: new Date().toISOString(),
  };
}
