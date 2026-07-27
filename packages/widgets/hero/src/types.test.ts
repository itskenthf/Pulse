import { describe, expect, it } from "vitest";
import { heroDataSchema } from "./types";

const validData = {
  greeting: "Good morning, Ken",
  dateFormatted: "Monday · 27 July",
  weatherSummary: "22°C, Clear sky",
  weatherLocation: "Kuching",
  weatherTip: "Stay hydrated out there.",
  quote: "Espresso yourself.",
  recentQuotes: ["Espresso yourself.", "My blood type is coffee."],
  generatedAt: "2026-07-27T00:00:00Z",
};

describe("heroDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(heroDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts a null weatherTip (no suggestion for current conditions)", () => {
    expect(heroDataSchema.safeParse({ ...validData, weatherTip: null }).success).toBe(true);
  });

  it("rejects a row missing a required field", () => {
    const { quote: _quote, ...withoutQuote } = validData;
    expect(heroDataSchema.safeParse(withoutQuote).success).toBe(false);
  });
});
