import { ensureWidgetRegistered } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { QuickLaunchData } from "./types";

export async function fetchQuickLaunchData(
  _context: WidgetFetchContext,
): Promise<QuickLaunchData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);
  return { registeredAt: new Date().toISOString() };
}
