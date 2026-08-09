import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Meals-only actions — one `toggleMeal` action (meal name in form data),
 *  not four near-identical ones, matching Tasks'/Reading's per-entity
 *  action shape. */
export interface MealsWidgetActions extends WidgetActions {
  toggleMeal: WidgetAction;
}
