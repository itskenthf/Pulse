import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Weight-only actions, following the same per-widget extension pattern
 *  Tasks'/Reading's actions established. */
export interface WeightWidgetActions extends WidgetActions {
  logWeight: WidgetAction;
  deleteWeightLog: WidgetAction;
  createWeightGoal: WidgetAction;
}
