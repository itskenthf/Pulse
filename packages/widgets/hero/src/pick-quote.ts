import { QUOTES } from "./quotes";

const RECENT_QUOTES_LIMIT = 5;

export interface QuotePick {
  text: string;
  recentQuotes: string[];
}

/**
 * Random pick excluding the last few shown quotes (not just the
 * immediately previous one) — with a small static list, excluding only
 * one quote still allows short A→B→A cycles that read as "it keeps
 * repeating." Falls back to the full list if the exclusion would leave no
 * candidates (a short list or an oversized history).
 */
export function pickQuote(recentQuotes: string[]): QuotePick {
  const candidates = QUOTES.filter((quote) => !recentQuotes.includes(quote.text));
  const pool = candidates.length > 0 ? candidates : QUOTES;
  const pick = pool[Math.floor(Math.random() * pool.length)] ?? QUOTES[0]!;

  return {
    text: pick.text,
    recentQuotes: [pick.text, ...recentQuotes].slice(0, RECENT_QUOTES_LIMIT),
  };
}
