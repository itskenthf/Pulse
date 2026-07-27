import { z } from "zod";

export type HeroPeriod = "morning" | "afternoon" | "evening" | "night";

export type QuoteCategory = "coffee" | "dev-humor" | "dark-humor" | "humor";

export interface Quote {
  text: string;
  category: QuoteCategory;
}

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — one definition instead of a
 * hand-maintained type that could drift from a hand-maintained schema.
 */
export const heroDataSchema = z.object({
  greeting: z.string(),
  dateFormatted: z.string(),
  weatherSummary: z.string(),
  weatherLocation: z.string(),
  /** Deterministic suggestion derived from the weather code — null when
   *  conditions don't warrant one (see weather-tip.ts). */
  weatherTip: z.string().nullable(),
  quote: z.string(),
  /** Last few quote texts shown, most recent first — widens the
   *  click-to-cycle/refresh anti-repeat window past just the previous
   *  quote. See pick-quote.ts. */
  recentQuotes: z.array(z.string()),
  generatedAt: z.string(),
});

export type HeroData = z.infer<typeof heroDataSchema>;
