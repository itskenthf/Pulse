export const WIDGET_ID = "insights";
export const WIDGET_NAME = "Insights";
export const WIDGET_DESCRIPTION = "Actionable observations from your Weight, Nutrition, and Meals data";

/** No Workout module exists yet (Phase 2 excluded it — see docs/DECISIONS.md),
 *  so insight rules are limited to Weight/Nutrition/Meals data only. */
export const MAX_INSIGHTS = 2;
export const WEIGHT_TREND_DAYS = 30;
export const MEAL_HISTORY_DAYS = 28;
export const NUTRITION_HISTORY_DAYS = 7;
