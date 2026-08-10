import { ensureWidgetRegistered, getCurrentWeekReview, listWeightLogs } from "@pulse/database";
import { currentWeekStart, isSundayInTimeZone } from "@pulse/health";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { WeeklyReviewData } from "./types";

/** No external API — same self-healing-backstop shape as Weight/Nutrition/
 *  Meals' fetchData. `weightKg` reads the most recent weigh-in from
 *  `weight_logs` rather than duplicating it into `weekly_reviews`. */
export async function fetchWeeklyReviewData(context: WidgetFetchContext): Promise<WeeklyReviewData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const [review, recentWeights] = await Promise.all([
    getCurrentWeekReview(context.userId),
    listWeightLogs(context.userId, 1),
  ]);

  return {
    weekOf: currentWeekStart(),
    review,
    weightKg: recentWeights[0]?.weightKg ?? null,
    isSunday: isSundayInTimeZone(),
    fetchedAt: new Date().toISOString(),
  };
}
