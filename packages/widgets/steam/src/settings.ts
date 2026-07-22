import type { SteamSettings } from "./types";

export const defaultSteamSettings: SteamSettings = {
  steamId64: "",
};

export function parseSteamSettingsForm(formData: FormData): SteamSettings {
  const steamId64 = formData.get("steamId64");

  if (typeof steamId64 !== "string" || !/^\d{17}$/.test(steamId64.trim())) {
    throw new Error("SteamID64 must be a 17-digit number (find yours at steamid.io)");
  }

  return { steamId64: steamId64.trim() };
}
