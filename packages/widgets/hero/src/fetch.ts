import { fetchCurrentWeather } from "@pulse/adapter-weather";
import { ensureWidgetRegistered, readWidgetCache, readWidgetSettings } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { QUOTES } from "./quotes";
import { defaultHeroSettings } from "./settings";
import type { HeroData, HeroPeriod, HeroSettings } from "./types";

const GREETINGS: Record<HeroPeriod, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good night",
};

function periodForHour(hour: number): HeroPeriod {
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

export async function fetchHeroData(context: WidgetFetchContext): Promise<HeroData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const settings =
    (await readWidgetSettings<HeroSettings>(context.userId, WIDGET_ID)) ?? defaultHeroSettings;

  const now = new Date();
  const period = periodForHour(hourInTimeZone(settings.timeZone, now));
  const greeting = settings.name ? `${GREETINGS[period]}, ${settings.name}` : GREETINGS[period];

  const weather = await fetchCurrentWeather({
    latitude: settings.latitude,
    longitude: settings.longitude,
  });

  const previous = await readWidgetCache<HeroData>(context.userId, WIDGET_ID);
  const previousQuote = previous?.data.quote;
  const candidates =
    QUOTES.length > 1 ? QUOTES.filter((quote) => quote.text !== previousQuote) : QUOTES;
  const quotePick = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    greeting,
    weatherSummary: `${Math.round(weather.temperatureC)}°C, ${weather.description}`,
    weatherLocation: settings.weatherLabel,
    quote: quotePick?.text ?? QUOTES[0]!.text,
    generatedAt: now.toISOString(),
  };
}
