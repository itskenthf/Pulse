import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { SteamComponent } from "./component";
import { fetchSteamData } from "./fetch";
import { defaultSteamSettings, parseSteamSettingsForm } from "./settings";
import { steamDataSchema, type SteamData, type SteamSettings } from "./types";

export const steamWidget: Widget<SteamData, SteamSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "md",
  refreshInterval: 10800, // 3h — playtime moves slowly (§4: entertainment data, every few hours)
  fetchData: fetchSteamData,
  dataSchema: steamDataSchema,
  render: SteamComponent,
  settings: () => defaultSteamSettings,
  parseSettingsForm: parseSteamSettingsForm,
  permissions: () => [],
};
