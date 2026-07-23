import { ensureWidgetRegistered, readWidgetCache } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { QUOTES } from "./quotes";
import type { QuoteData } from "./types";

export async function fetchQuoteData(context: WidgetFetchContext): Promise<QuoteData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const previous = await readWidgetCache<QuoteData>(context.userId, WIDGET_ID);
  const previousText = previous?.data.text;

  const candidates =
    QUOTES.length > 1 ? QUOTES.filter((quote) => quote.text !== previousText) : QUOTES;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  return {
    text: pick?.text ?? QUOTES[0]!.text,
    fetchedAt: new Date().toISOString(),
  };
}
