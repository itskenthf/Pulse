import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { HeroComponent } from "./component";
import { fetchHeroData } from "./fetch";
import { defaultHeroSettings, parseHeroSettingsForm } from "./settings";
import type { HeroData, HeroSettings } from "./types";

export const heroWidget: Widget<HeroData, HeroSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "hero",
  refreshInterval: 900, // 15 min — frequent enough that the greeting/weather rarely read stale
  fetchData: fetchHeroData,
  render: HeroComponent,
  settings: () => defaultHeroSettings,
  parseSettingsForm: parseHeroSettingsForm,
  permissions: () => [],
};
