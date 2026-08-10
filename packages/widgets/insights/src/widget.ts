import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { InsightsComponent } from "./component";
import { fetchInsightsData } from "./fetch";
import { insightsDataSchema, type InsightsData } from "./types";

export const insightsWidget: Widget<InsightsData, Record<string, unknown>> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900,
  fetchData: fetchInsightsData,
  dataSchema: insightsDataSchema,
  render: InsightsComponent,
  permissions: () => [],
};
