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

export interface HeroSettings {
  name: string;
  /** IANA time zone (e.g. "Asia/Kuching") — the server runs in UTC, so
   *  without this the greeting's time-of-day would be wrong for the user. */
  timeZone: string;
  weatherLabel: string;
  latitude: number;
  longitude: number;
}

export interface HeroData {
  greeting: string;
  weatherSummary: string;
  weatherLocation: string;
  quote: string;
  generatedAt: string;
}
