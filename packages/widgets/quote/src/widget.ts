import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { QuoteComponent } from "./component";
import { fetchQuoteData } from "./fetch";
import type { QuoteData } from "./types";

export const quoteWidget: Widget<QuoteData> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 1800, // 30 min — rotates through the day via the scheduler too
  fetchData: fetchQuoteData,
  render: QuoteComponent,
  permissions: () => [],
};
