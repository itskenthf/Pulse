import type { GreetingSettings } from "./types";

export const defaultGreetingSettings: GreetingSettings = {
  name: "",
  timeZone: "Asia/Manila",
};

export function parseGreetingSettingsForm(formData: FormData): GreetingSettings {
  const name = formData.get("name");
  const timeZone = formData.get("timeZone");

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
    throw new Error(`"${timeZone}" is not a valid time zone (e.g. "Asia/Manila")`);
  }

  return { name: name.trim(), timeZone: timeZone.trim() };
}
