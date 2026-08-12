import { fetchCurrentWeather } from "@pulse/adapter-weather";
import { ensureWidgetRegistered, readUserName, readWidgetCache } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import {
  HERO_TIME_ZONE,
  WEATHER_LATITUDE,
  WEATHER_LOCATION_LABEL,
  WEATHER_LONGITUDE,
  WIDGET_DESCRIPTION,
  WIDGET_ID,
  WIDGET_NAME,
} from "./constants";
import { pickQuote } from "./pick-quote";
import type { HeroData, HeroPeriod } from "./types";
import { weatherTip } from "./weather-tip";

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

  const now = new Date();
  const period = periodForHour(hourInTimeZone(HERO_TIME_ZONE, now));

  // None of these three depends on either of the others' results — reading
  // them concurrently instead of sequentially roughly cuts this function's
  // own latency to the slowest of the three instead of their sum (see
  // docs/DECISIONS.md's 2026-08-12 entry).
  const [name, weather, previous] = await Promise.all([
    readUserName(context.userId),
    fetchCurrentWeather({ latitude: WEATHER_LATITUDE, longitude: WEATHER_LONGITUDE }, context.signal),
    // Unvalidated on purpose: this is a soft best-effort read (avoid
    // repeating recent quotes), not data reaching render() — worst case on
    // a shape mismatch is a repeated quote, not worth failing this whole
    // fetch over the way a validated read legitimately should elsewhere.
    readWidgetCache<HeroData>(context.userId, WIDGET_ID),
  ]);

  const greeting = name ? `${GREETINGS[period]}, ${name}` : GREETINGS[period];

  // "Friday · 24 July" — short and conversational, not the full
  // "Friday, July 24, 2026" a form field would use.
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: HERO_TIME_ZONE,
    weekday: "long",
  }).format(now);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: HERO_TIME_ZONE, day: "numeric" }).format(
    now,
  );
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: HERO_TIME_ZONE,
    month: "long",
  }).format(now);
  const dateFormatted = `${weekday} · ${day} ${month}`;

  const quotePick = pickQuote(previous?.data.recentQuotes ?? []);

  return {
    greeting,
    dateFormatted,
    weatherSummary: `${Math.round(weather.temperatureC)}°C, ${weather.description}`,
    weatherLocation: WEATHER_LOCATION_LABEL,
    weatherTip: weatherTip(weather.weatherCode, weather.temperatureC),
    quote: quotePick.text,
    recentQuotes: quotePick.recentQuotes,
    generatedAt: now.toISOString(),
  };
}
