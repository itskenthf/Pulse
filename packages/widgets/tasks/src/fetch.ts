import { ensureWidgetRegistered, listTasks } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { TaskData } from "./types";

/**
 * Unlike every other widget, there's no external API here — "fetching"
 * just means reading the user's own `tasks` table. The scheduler still
 * calls this on the normal cron cadence as a self-healing backstop, but
 * the actions in apps/web/src/app/actions/tasks.ts also call
 * `refreshWidget` right after every write so the dashboard reflects a
 * change instantly instead of waiting for the next cron tick.
 */
export async function fetchTaskData(context: WidgetFetchContext): Promise<TaskData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const tasks = await listTasks(context.userId);

  return { tasks, fetchedAt: new Date().toISOString() };
}
