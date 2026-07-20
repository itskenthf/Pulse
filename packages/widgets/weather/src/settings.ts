import type { WeatherSettings } from "./types";

export const defaultWeatherSettings: WeatherSettings = {
  label: "Manila",
  latitude: 14.5995,
  longitude: 120.9842,
};

export function parseWeatherSettingsForm(formData: FormData): WeatherSettings {
  const label = formData.get("label");
  const latitude = formData.get("latitude");
  const longitude = formData.get("longitude");

  if (typeof label !== "string" || label.trim().length === 0) {
    throw new Error("Location label is required");
  }

  const lat = Number(latitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("Latitude must be a number between -90 and 90");
  }

  const lon = Number(longitude);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error("Longitude must be a number between -180 and 180");
  }

  return { label: label.trim(), latitude: lat, longitude: lon };
}
