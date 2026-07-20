import { ensureWidgetRegistered, readWidgetSettings } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { defaultGreetingSettings } from "./settings";
import type { GreetingData, GreetingPeriod, GreetingSettings } from "./types";

const GREETINGS: Record<GreetingPeriod, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
};

function periodForHour(hour: number): GreetingPeriod {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

/** The server runs in UTC — resolve the hour in the user's own time zone. */
function hourInTimeZone(timeZone: string, date: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(date);
  return Number(formatted) % 24;
}

export async function fetchGreetingData(context: WidgetFetchContext): Promise<GreetingData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const settings =
    (await readWidgetSettings<GreetingSettings>(context.userId, WIDGET_ID)) ??
    defaultGreetingSettings;

  const now = new Date();
  const period = periodForHour(hourInTimeZone(settings.timeZone, now));
  const greeting = GREETINGS[period];

  return {
    message: settings.name ? `${greeting}, ${settings.name}` : greeting,
    period,
    generatedAt: now.toISOString(),
  };
}
