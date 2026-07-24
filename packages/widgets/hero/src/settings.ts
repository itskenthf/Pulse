import type { HeroSettings } from "./types";

export const defaultHeroSettings: HeroSettings = {
  name: "",
  timeZone: "Asia/Kuching",
  weatherLabel: "Kuching",
  latitude: 1.5497,
  longitude: 110.3593,
};

export function parseHeroSettingsForm(formData: FormData): HeroSettings {
  const name = formData.get("name");
  const timeZone = formData.get("timeZone");
  const weatherLabel = formData.get("weatherLabel");
  const latitude = formData.get("latitude");
  const longitude = formData.get("longitude");

  if (typeof name !== "string") {
    throw new Error("Name is required (can be left blank)");
  }
  if (typeof timeZone !== "string" || timeZone.trim().length === 0) {
    throw new Error("Time zone is required");
  }
  try {
    // Throws RangeError for an invalid IANA time zone name.
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone.trim() });
  } catch {
    throw new Error(`"${timeZone}" is not a valid time zone (e.g. "Asia/Kuching")`);
  }

  if (typeof weatherLabel !== "string" || weatherLabel.trim().length === 0) {
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

  return {
    name: name.trim(),
    timeZone: timeZone.trim(),
    weatherLabel: weatherLabel.trim(),
    latitude: lat,
    longitude: lon,
  };
}
