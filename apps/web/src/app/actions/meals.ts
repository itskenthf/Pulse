"use server";

import { setMealChecked, type Meal } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { MEALS_WIDGET_ID, type MealsData } from "@pulse/widget-meals";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/health/meals"];
const VALID_MEALS = new Set<Meal>(["breakfast", "lunch", "dinner", "snack"]);

export async function toggleMealAction(
  _prevState: WidgetActionState,
  formData: FormData,
): Promise<WidgetActionState> {
  return runWidgetWriteAction(formData, {
    widgetId: MEALS_WIDGET_ID,
    revalidatePaths: REVALIDATE_PATHS,
    errorMessage: "Failed to update meal",
    write: async (userId, formData) => {
      const meal = formData.get("meal");
      const checked = formData.get("checked");

      if (typeof meal !== "string" || !VALID_MEALS.has(meal as Meal)) {
        return { error: "Invalid meal" };
      }
      if (checked !== "true" && checked !== "false") {
        return { error: "Invalid value" };
      }

      // setMealChecked's own upsert already returns the full resulting
      // row (see its own doc comment) — that's the entirety of what
      // fetchMealsData composes, so it's handed straight to refreshWidget
      // as knownData instead of a separate getTodayMeals re-read.
      const today = await setMealChecked(userId, meal as Meal, checked === "true");
      const refreshData: MealsData = { today, fetchedAt: new Date().toISOString() };
      return { refreshData };
    },
  });
}
