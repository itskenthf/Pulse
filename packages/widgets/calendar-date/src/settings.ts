import type { CalendarDateSettings } from "./types";

export const defaultCalendarDateSettings: CalendarDateSettings = {
  timeZone: "Asia/Kuching",
};

export function parseCalendarDateSettingsForm(formData: FormData): CalendarDateSettings {
  const timeZone = formData.get("timeZone");

  if (typeof timeZone !== "string" || timeZone.trim().length === 0) {
    throw new Error("Time zone is required");
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone.trim() });
  } catch {
    throw new Error(`"${timeZone}" is not a valid time zone (e.g. "Asia/Kuching")`);
  }

  return { timeZone: timeZone.trim() };
}
