export type HeroPeriod = "morning" | "afternoon" | "evening" | "night";

export type QuoteCategory = "coffee" | "dev-humor" | "dark-humor" | "humor";

export interface Quote {
  text: string;
  category: QuoteCategory;
}

export interface HeroData {
  greeting: string;
  dateFormatted: string;
  weatherSummary: string;
  weatherLocation: string;
  /** Deterministic suggestion derived from the weather code — null when
   *  conditions don't warrant one (see weather-tip.ts). */
  weatherTip: string | null;
  quote: string;
  generatedAt: string;
}
