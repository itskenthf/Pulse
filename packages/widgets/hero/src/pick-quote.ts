import { QUOTES } from "./quotes";

export interface QuotePick {
  text: string;
  recentQuotes: string[];
}

/**
 * Sequential rotation through QUOTES in list order (coffee → dev-humor →
 * dark-humor → humor), wrapping back to the start once the list is
 * exhausted — not random. `recentQuotes` holds just the last shown
 * quote's text, used only to find where in the list to resume from; if
 * it's missing or no longer in QUOTES (list edited, or first-ever pick),
 * rotation restarts from the first quote.
 */
export function pickQuote(recentQuotes: string[]): QuotePick {
  const lastText = recentQuotes[0];
  const lastIndex = lastText ? QUOTES.findIndex((quote) => quote.text === lastText) : -1;
  const nextIndex = (lastIndex + 1) % QUOTES.length;
  const pick = QUOTES[nextIndex]!;

  return {
    text: pick.text,
    recentQuotes: [pick.text],
  };
}
