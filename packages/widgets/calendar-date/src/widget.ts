import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { CalendarDateComponent } from "./component";
import { fetchCalendarDateData } from "./fetch";
import { defaultCalendarDateSettings, parseCalendarDateSettingsForm } from "./settings";
import type { CalendarDateData, CalendarDateSettings } from "./types";

export const calendarDateWidget: Widget<CalendarDateData, CalendarDateSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 3600, // 1h — the date only changes once every 24h
  fetchData: fetchCalendarDateData,
  render: CalendarDateComponent,
  settings: () => defaultCalendarDateSettings,
  parseSettingsForm: parseCalendarDateSettingsForm,
  permissions: () => [],
};
