import { fetchCurrentWeather } from "@pulse/adapter-weather";
import { ensureWidgetRegistered, readWidgetSettings } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { defaultWeatherSettings } from "./settings";
import type { WeatherData, WeatherSettings } from "./types";

export async function fetchWeatherData(context: WidgetFetchContext): Promise<WeatherData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const settings =
    (await readWidgetSettings<WeatherSettings>(context.userId, WIDGET_ID)) ??
    defaultWeatherSettings;

  const weather = await fetchCurrentWeather({
    latitude: settings.latitude,
    longitude: settings.longitude,
  });

  return {
    temperatureC: weather.temperatureC,
    windSpeedKmh: weather.windSpeedKmh,
    description: weather.description,
    location: settings.label,
    observedAt: weather.observedAt,
  };
}
