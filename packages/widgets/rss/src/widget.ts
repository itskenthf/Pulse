import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { RssComponent } from "./component";
import { fetchRssData } from "./fetch";
import { defaultRssSettings, parseRssSettingsForm } from "./settings";
import { rssDataSchema, type RssData, type RssSettings } from "./types";

export const rssWidget: Widget<RssData, RssSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 3600, // 1h — blog posts don't need cron-tick-level freshness
  fetchData: fetchRssData,
  dataSchema: rssDataSchema,
  render: RssComponent,
  settings: () => defaultRssSettings,
  parseSettingsForm: parseRssSettingsForm,
};
