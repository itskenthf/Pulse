"use server";

import { revalidatePath } from "next/cache";
import { createTask, deleteTask, setTaskCompleted } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";
import { auth } from "@/auth";
import { refreshWidget } from "@/lib/refresh-widget";

/**
 * All three actions follow `updateWidgetSettingsAction`'s shape
 * (apps/web/src/app/actions/widgets.ts): write → `refreshWidget`
 * (re-reads the `tasks` table, writes fresh `widget_cache`, runs
 * `deriveMemories`) → `revalidatePath("/")`, so the dashboard reflects
 * the change immediately instead of waiting for the next cron tick.
 */

export async function addTaskAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const title = formData.get("title");
  if (typeof title !== "string" || !title.trim()) {
    return { error: "Task title can't be empty" };
  }

  try {
    await createTask(session.user.id, title.trim());
    await refreshWidget(TASKS_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add task" };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return {};
}

export async function toggleTaskAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const taskId = formData.get("taskId");
  const completed = formData.get("completed");
  if (typeof taskId !== "string" || typeof completed !== "string") {
    return { error: "Invalid task update" };
  }

  try {
    await setTaskCompleted(session.user.id, taskId, completed === "true");
    await refreshWidget(TASKS_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update task" };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return {};
}

export async function deleteTaskAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") {
    return { error: "Invalid task" };
  }

  try {
    await deleteTask(session.user.id, taskId);
    await refreshWidget(TASKS_WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete task" };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  return {};
}
