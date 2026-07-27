import { readWidgetCache, writeWidgetCache } from "@pulse/database";
import { WIDGET_ID } from "./constants";
import { fetchHeroData } from "./fetch";
import { pickQuote } from "./pick-quote";
import { heroDataSchema, type HeroData } from "./types";

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Swaps only the quote in the cached Hero data — no weather re-fetch —
 * so clicking the quote to cycle it feels instant even across several
 * clicks in a row. Falls back to a full fetch when there's no cache yet
 * (clicking before the widget has ever loaded).
 */
export async function cycleQuote(userId: string): Promise<HeroData> {
  const previous = await readWidgetCache(userId, WIDGET_ID, heroDataSchema);
  if (!previous) {
    return fetchHeroData({ userId, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  }

  const quotePick = pickQuote(previous.data.recentQuotes);
  const next: HeroData = {
    ...previous.data,
    quote: quotePick.text,
    recentQuotes: quotePick.recentQuotes,
  };

  await writeWidgetCache(userId, WIDGET_ID, next);
  return next;
}
