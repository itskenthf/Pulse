import { describeWeatherCode } from "./weather-codes";

export interface WeatherLocation {
  latitude: number;
  longitude: number;
}

export interface NormalizedWeather {
  temperatureC: number;
  windSpeedKmh: number;
  weatherCode: number;
  description: string;
  observedAt: string;
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
}

/**
 * Open-Meteo requires no API key. This is the only place in the codebase
 * that talks to it — widgets consume the normalized shape, never the raw
 * response.
 */
export async function fetchCurrentWeather(
  location: WeatherLocation,
  signal?: AbortSignal,
): Promise<NormalizedWeather> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed: ${response.status}`);
  }

  const body = (await response.json()) as OpenMeteoResponse;
  const current = body.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.weather_code !== "number" ||
    typeof current.wind_speed_10m !== "number"
  ) {
    throw new Error("Open-Meteo response missing current conditions");
  }

  return {
    temperatureC: current.temperature_2m,
    windSpeedKmh: current.wind_speed_10m,
    weatherCode: current.weather_code,
    description: describeWeatherCode(current.weather_code),
    observedAt: current.time ?? new Date().toISOString(),
  };
}
