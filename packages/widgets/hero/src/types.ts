export type HeroPeriod = "morning" | "afternoon" | "evening" | "night";

export type QuoteCategory =
  | "coffee"
  | "dev-humor"
  | "gaming"
  | "minimalism"
  | "relationship"
  | "programming"
  | "stoicism";

export interface Quote {
  text: string;
  category: QuoteCategory;
}

export interface HeroData {
  greeting: string;
  dateFormatted: string;
  weatherSummary: string;
  weatherLocation: string;
  quote: string;
  generatedAt: string;
}
