import { describe, expect, it } from "vitest";
import { pickQuote } from "./pick-quote";
import { QUOTES } from "./quotes";

describe("pickQuote", () => {
  it("starts from the first quote when there's no history yet", () => {
    const result = pickQuote([]);
    expect(result.text).toBe(QUOTES[0]!.text);
  });

  it("advances to the next quote in list order", () => {
    const result = pickQuote([QUOTES[3]!.text]);
    expect(result.text).toBe(QUOTES[4]!.text);
  });

  it("wraps back to the first quote after the last one", () => {
    const result = pickQuote([QUOTES[QUOTES.length - 1]!.text]);
    expect(result.text).toBe(QUOTES[0]!.text);
  });

  it("restarts from the first quote when the last shown quote isn't in the list", () => {
    const result = pickQuote(["a quote that no longer exists"]);
    expect(result.text).toBe(QUOTES[0]!.text);
  });

  it("returns a single-entry recentQuotes holding just the picked quote", () => {
    const result = pickQuote([QUOTES[0]!.text]);
    expect(result.recentQuotes).toEqual([result.text]);
  });

  it("cycles through the entire list back to the start", () => {
    let recent: string[] = [];
    const seen: string[] = [];
    for (let i = 0; i < QUOTES.length; i++) {
      const result = pickQuote(recent);
      seen.push(result.text);
      recent = result.recentQuotes;
    }
    expect(seen).toEqual(QUOTES.map((quote) => quote.text));

    const wrapped = pickQuote(recent);
    expect(wrapped.text).toBe(QUOTES[0]!.text);
  });
});
