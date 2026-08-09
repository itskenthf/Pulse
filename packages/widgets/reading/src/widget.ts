import type { Widget } from "@pulse/sdk";
import type { ReadingWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { ReadingComponent } from "./component";
import { fetchReadingData } from "./fetch";
import { readingDataSchema, type ReadingData } from "./types";

export const readingWidget: Widget<ReadingData, Record<string, unknown>, ReadingWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900, // 15 min — self-healing backstop; mutations refresh instantly on their own
  fetchData: fetchReadingData,
  dataSchema: readingDataSchema,
  render: ReadingComponent,
  permissions: () => [],
};
