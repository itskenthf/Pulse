import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { QuickLaunchComponent } from "./component";
import { fetchQuickLaunchData } from "./fetch";
import { defaultQuickLaunchSettings, parseQuickLaunchSettingsForm } from "./settings";
import type { QuickLaunchData, QuickLaunchSettings } from "./types";

export const quickLaunchWidget: Widget<QuickLaunchData, QuickLaunchSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 86400, // pure config — nothing to refresh, cron just keeps it registered
  fetchData: fetchQuickLaunchData,
  render: QuickLaunchComponent,
  settings: () => defaultQuickLaunchSettings,
  parseSettingsForm: parseQuickLaunchSettingsForm,
  permissions: () => [],
};
