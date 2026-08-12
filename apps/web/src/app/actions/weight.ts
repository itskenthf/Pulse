"use server";

import { createGoal, deactivateGoal, deleteWeightLog, listGoals, logWeight } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { WEIGHT_WIDGET_ID } from "@pulse/widget-weight";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/health/weight"];

export async function logWeightAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: WEIGHT_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to log weight",
    write: async (userId, formData) => {
      const weightKg = formData.get("weightKg");
      const weightKgNum = typeof weightKg === "string" ? Number(weightKg) : NaN;
      if (!Number.isFinite(weightKgNum) || weightKgNum <= 0) {
        return { error: "Weight must be a positive number" };
      }

      await logWeight(userId, { weightKg: weightKgNum });
    },
  });
}

export async function deleteWeightLogAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: WEIGHT_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to delete weigh-in",
    write: async (userId, formData) => {
      const logId = formData.get("logId");
      if (typeof logId !== "string") {
        return { error: "Invalid weigh-in" };
      }
      await deleteWeightLog(userId, logId);
    },
  });
}

export async function createWeightGoalAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: WEIGHT_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to set goal",
    write: async (userId, formData) => {
      const title = formData.get("title");
      const targetValue = formData.get("targetValue");
      const comparator = formData.get("comparator");

      if (typeof title !== "string" || !title.trim()) {
        return { error: "Title can't be empty" };
      }
      const targetValueNum = typeof targetValue === "string" ? Number(targetValue) : NaN;
      if (!Number.isFinite(targetValueNum) || targetValueNum <= 0) {
        return { error: "Target must be a positive number" };
      }
      if (comparator !== "at_least" && comparator !== "at_most") {
        return { error: "Invalid goal direction" };
      }

      // Replace, don't accumulate: same one-active-goal-per-metric guard
      // createNutritionGoalAction already uses, so a double-submit can't
      // leave a stale weight goal silently active alongside the new one.
      const existing = await listGoals(userId, { activeOnly: true, metric: "weight_kg" });
      await Promise.all(existing.map((goal) => deactivateGoal(userId, goal.id)));

      await createGoal(userId, {
        title: title.trim(),
        metric: "weight_kg",
        comparator,
        targetValue: targetValueNum,
        cadence: "once",
      });
    },
  });
}
