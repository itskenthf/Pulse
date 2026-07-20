import type { ClockSettings } from "./types";

export const defaultClockSettings: ClockSettings = {
  timeZone: "Asia/Kuching",
  hour12: false,
};

export function parseClockSettingsForm(formData: FormData): ClockSettings {
  const timeZone = formData.get("timeZone");
  const hour12 = formData.get("hour12");

  if (typeof timeZone !== "string" || timeZone.trim().length === 0) {
    throw new Error("Time zone is required");
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone.trim() });
  } catch {
    throw new Error(`"${timeZone}" is not a valid time zone (e.g. "Asia/Kuching")`);
  }

  return { timeZone: timeZone.trim(), hour12: hour12 === "on" };
}
