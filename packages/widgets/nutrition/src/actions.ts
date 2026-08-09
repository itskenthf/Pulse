import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Nutrition-only actions. `logAmount` is the one-tap increment (field +
 *  amount in form data); `setAmount` is the detail page's exact-value
 *  correction — one action each, not four, matching Meals'
 *  single-`toggleMeal` pattern rather than four near-identical actions. */
export interface NutritionWidgetActions extends WidgetActions {
  logAmount: WidgetAction;
  setAmount: WidgetAction;
}
