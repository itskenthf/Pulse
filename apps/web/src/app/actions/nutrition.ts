"use server";

import {
  createGoal,
  deactivateGoal,
  incrementNutrition,
  listGoals,
  setNutritionField,
  type GoalMetric,
  type NutritionField,
} from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { assembleNutritionDataFromToday, NUTRITION_WIDGET_ID } from "@pulse/widget-nutrition";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/health/nutrition"];
const VALID_FIELDS = new Set<NutritionField>(["calories", "protein_g", "water_ml", "milk_ml"]);
const VALID_GOAL_METRICS = new Set<GoalMetric>(["calories", "protein_g", "water_ml", "milk_ml"]);

const METRIC_LABELS: Record<string, string> = {
  calories: "Calories",
  protein_g: "Protein",
  water_ml: "Water",
  milk_ml: "Milk",
};

function parseField(formData: FormData): NutritionField | null {
  const field = formData.get("field");
  return typeof field === "string" && VALID_FIELDS.has(field as NutritionField)
    ? (field as NutritionField)
    : null;
}

export async function logAmountAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NUTRITION_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to log amount",
    write: async (userId, formData) => {
      const field = parseField(formData);
      if (!field) return { error: "Invalid field" };

      const amount = formData.get("amount");
      const amountNum = typeof amount === "string" ? Number(amount) : NaN;
      if (!Number.isFinite(amountNum)) {
        return { error: "Amount must be a number" };
      }

      // incrementNutrition's own upsert already returns the new row (see
      // its own doc comment) — assembling from that instead of a separate
      // getTodayNutrition re-read skips one of fetchNutritionData's three
      // reads; goals/history still need their own reads, since a single
      // field's write doesn't determine either of those.
      const today = await incrementNutrition(userId, field, amountNum);
      const refreshData = await assembleNutritionDataFromToday(userId, today);
      return { refreshData };
    },
  });
}

export async function setAmountAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NUTRITION_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to set amount",
    write: async (userId, formData) => {
      const field = parseField(formData);
      if (!field) return { error: "Invalid field" };

      const amount = formData.get("amount");
      const amountNum = typeof amount === "string" ? Number(amount) : NaN;
      if (!Number.isInteger(amountNum) || amountNum < 0) {
        return { error: "Amount must be zero or a positive whole number" };
      }

      await setNutritionField(userId, field, amountNum);
    },
  });
}

export async function createNutritionGoalAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: NUTRITION_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to set target",
    write: async (userId, formData) => {
      const metric = formData.get("metric");
      const targetValue = formData.get("targetValue");
      const comparator = formData.get("comparator");

      if (typeof metric !== "string" || !VALID_GOAL_METRICS.has(metric as GoalMetric)) {
        return { error: "Invalid metric" };
      }
      const targetValueNum = typeof targetValue === "string" ? Number(targetValue) : NaN;
      if (!Number.isFinite(targetValueNum) || targetValueNum <= 0) {
        return { error: "Target must be a positive number" };
      }
      if (comparator !== "at_least" && comparator !== "at_most") {
        return { error: "Invalid goal direction" };
      }

      // Replace, don't accumulate: a metric can only have one active daily
      // target at a time, so re-submitting the form updates it in place
      // instead of stacking a second active goal for the same metric.
      const existing = await listGoals(userId, { activeOnly: true, metric: metric as GoalMetric });
      await Promise.all(existing.map((goal) => deactivateGoal(userId, goal.id)));

      await createGoal(userId, {
        title: `${METRIC_LABELS[metric]} target`,
        metric: metric as GoalMetric,
        comparator,
        targetValue: targetValueNum,
        cadence: "daily",
      });
    },
  });
}
