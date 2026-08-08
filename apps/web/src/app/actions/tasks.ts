"use server";

import { createTask, deleteTask, setTaskCompleted } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/tasks"];

export async function addTaskAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: TASKS_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to add task",
    write: async (userId, formData) => {
      const title = formData.get("title");
      if (typeof title !== "string" || !title.trim()) {
        return { error: "Task title can't be empty" };
      }
      await createTask(userId, title.trim());
    },
  });
}

export async function toggleTaskAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: TASKS_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to update task",
    write: async (userId, formData) => {
      const taskId = formData.get("taskId");
      const completed = formData.get("completed");
      if (typeof taskId !== "string" || typeof completed !== "string") {
        return { error: "Invalid task update" };
      }
      await setTaskCompleted(userId, taskId, completed === "true");
    },
  });
}

export async function deleteTaskAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: TASKS_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to delete task",
    write: async (userId, formData) => {
      const taskId = formData.get("taskId");
      if (typeof taskId !== "string") {
        return { error: "Invalid task" };
      }
      await deleteTask(userId, taskId);
    },
  });
}
