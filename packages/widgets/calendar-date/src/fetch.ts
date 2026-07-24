import { ensureWidgetRegistered, readWidgetSettings } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { defaultCalendarDateSettings } from "./settings";
import type { CalendarDateData, CalendarDateSettings } from "./types";

export async function fetchCalendarDateData(
  context: WidgetFetchContext,
): Promise<CalendarDateData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const settings =
    (await readWidgetSettings<CalendarDateSettings>(context.userId, WIDGET_ID)) ??
    defaultCalendarDateSettings;

  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return { formatted };
}
