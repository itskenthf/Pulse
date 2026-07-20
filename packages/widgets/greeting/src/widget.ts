import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { GreetingComponent } from "./component";
import { fetchGreetingData } from "./fetch";
import { defaultGreetingSettings, parseGreetingSettingsForm } from "./settings";
import type { GreetingData, GreetingSettings } from "./types";

export const greetingWidget: Widget<GreetingData, GreetingSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900, // 15 min — frequent enough that the period rarely reads stale
  fetchData: fetchGreetingData,
  render: GreetingComponent,
  settings: () => defaultGreetingSettings,
  parseSettingsForm: parseGreetingSettingsForm,
  permissions: () => [],
};
