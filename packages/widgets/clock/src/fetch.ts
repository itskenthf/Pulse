import { ensureWidgetRegistered } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { ClockData } from "./types";

export async function fetchClockData(_context: WidgetFetchContext): Promise<ClockData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);
  return { registeredAt: new Date().toISOString() };
}
