import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Weekly-Review-only action — a single upsert covering every field,
 *  matching Weight's/Nutrition's goal-form actions rather than one
 *  action per field. */
export interface WeeklyReviewWidgetActions extends WidgetActions {
  saveReview: WidgetAction;
}
