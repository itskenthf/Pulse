import { ensureWidgetRegistered, getTodayMeals } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { MealsData } from "./types";

/** No external API — same self-healing-backstop shape as Tasks/Nutrition's
 *  fetchData. */
export async function fetchMealsData(context: WidgetFetchContext): Promise<MealsData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const today = await getTodayMeals(context.userId);

  return { today, fetchedAt: new Date().toISOString() };
}
