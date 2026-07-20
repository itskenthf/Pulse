import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { WeatherComponent } from "./component";
import { fetchWeatherData } from "./fetch";
import { defaultWeatherSettings, parseWeatherSettingsForm } from "./settings";
import type { WeatherData, WeatherSettings } from "./types";

export const weatherWidget: Widget<WeatherData, WeatherSettings> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 1800, // 30 min, per reference doc §4
  fetchData: fetchWeatherData,
  render: WeatherComponent,
  settings: () => defaultWeatherSettings,
  parseSettingsForm: parseWeatherSettingsForm,
  permissions: () => [],
};
