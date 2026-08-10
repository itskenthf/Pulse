import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { DailyDigestComponent } from "./component";
import { fetchDailyDigestData } from "./fetch";
import { dailyDigestDataSchema, type DailyDigestData } from "./types";

export const dailyDigestWidget: Widget<DailyDigestData, Record<string, unknown>> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900,
  fetchData: fetchDailyDigestData,
  dataSchema: dailyDigestDataSchema,
  render: DailyDigestComponent,
  permissions: () => [],
};
