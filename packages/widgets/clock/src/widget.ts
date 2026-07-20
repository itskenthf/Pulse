import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { ClockComponent } from "./component";
import { fetchClockData } from "./fetch";
import { defaultClockSettings, parseClockSettingsForm } from "./settings";
import type { ClockData, ClockSettings } from "./types";

export const clockWidget: Widget<ClockData, ClockSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 3600, // fetchData is trivial — the display itself ticks client-side
  fetchData: fetchClockData,
  render: ClockComponent,
  settings: () => defaultClockSettings,
  parseSettingsForm: parseClockSettingsForm,
  permissions: () => [],
};
