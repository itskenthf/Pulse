import { describe, expect, it } from "vitest";
import { pickQuote } from "./pick-quote";
import { QUOTES } from "./quotes";

describe("pickQuote", () => {
  it("never returns a quote in the exclusion list when candidates remain", () => {
    const recent = QUOTES.slice(0, 5).map((quote) => quote.text);
    for (let i = 0; i < 20; i++) {
      const result = pickQuote(recent);
      expect(recent).not.toContain(result.text);
    }
  });

  it("caps recentQuotes at 5 entries, most recent first", () => {
    const recent = QUOTES.slice(0, 5).map((quote) => quote.text);
    const result = pickQuote(recent);
    expect(result.recentQuotes).toHaveLength(5);
    expect(result.recentQuotes[0]).toBe(result.text);
  });

  it("falls back to the full list when exclusion would leave no candidates", () => {
    const allTexts = QUOTES.map((quote) => quote.text);
    const result = pickQuote(allTexts);
    expect(allTexts).toContain(result.text);
  });

  it("returns a real quote when there's no history yet", () => {
    const result = pickQuote([]);
    expect(QUOTES.map((quote) => quote.text)).toContain(result.text);
  });
});
