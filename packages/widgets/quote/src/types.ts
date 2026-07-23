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

export interface QuoteData {
  text: string;
  fetchedAt: string;
}
