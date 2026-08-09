"use server";

import { incrementNutrition, setNutritionField, type NutritionField } from "@pulse/database";
import type { WidgetActionState } from "@pulse/sdk";
import { NUTRITION_WIDGET_ID } from "@pulse/widget-nutrition";
import { runWidgetWriteAction } from "@/lib/run-widget-write-action";

const REVALIDATE_PATHS = ["/", "/health/nutrition"];
const VALID_FIELDS = new Set<NutritionField>(["calories", "protein_g", "water_ml", "milk_ml"]);

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

      await incrementNutrition(userId, field, amountNum);
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
