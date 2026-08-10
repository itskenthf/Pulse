import type { Widget } from "@pulse/sdk";
import type { WeeklyReviewWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { WeeklyReviewComponent } from "./component";
import { fetchWeeklyReviewData } from "./fetch";
import { weeklyReviewDataSchema, type WeeklyReviewData } from "./types";

export const weeklyReviewWidget: Widget<WeeklyReviewData, Record<string, unknown>, WeeklyReviewWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900,
  fetchData: fetchWeeklyReviewData,
  dataSchema: weeklyReviewDataSchema,
  render: WeeklyReviewComponent,
  permissions: () => [],
};
