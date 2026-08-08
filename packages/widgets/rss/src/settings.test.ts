import { describe, expect, it } from "vitest";
import { parseRssSettingsForm } from "./settings";

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseRssSettingsForm", () => {
  it("parses a single filled slot, defaulting priority to 1 when blank", () => {
    const result = parseRssSettingsForm(
      formData({ source1Name: "GitHub Blog", source1Url: "https://github.blog/feed/" }),
    );

    expect(result).toEqual({
      sources: [{ name: "GitHub Blog", url: "https://github.blog/feed/", priority: 1 }],
    });
  });

  it("parses multiple slots and skips entirely-blank ones", () => {
    const result = parseRssSettingsForm(
      formData({
        source1Name: "9to5Mac",
        source1Url: "https://9to5mac.com/feed/",
        source1Priority: "2",
        source3Name: "MacRumors",
        source3Url: "https://feeds.macrumors.com/MacRumors-All",
        source3Priority: "2",
      }),
    );

    expect(result.sources).toEqual([
      { name: "9to5Mac", url: "https://9to5mac.com/feed/", priority: 2 },
      { name: "MacRumors", url: "https://feeds.macrumors.com/MacRumors-All", priority: 2 },
    ]);
  });

  it("trims whitespace from name and URL", () => {
    const result = parseRssSettingsForm(
      formData({ source1Name: "  9to5Mac  ", source1Url: "  https://9to5mac.com/feed/  " }),
    );

    expect(result.sources[0]).toEqual({
      name: "9to5Mac",
      url: "https://9to5mac.com/feed/",
      priority: 1,
    });
  });

  it("rejects a slot with a name but no URL", () => {
    expect(() => parseRssSettingsForm(formData({ source2Name: "Half filled" }))).toThrow(
      "Source 2 needs both a name and a URL",
    );
  });

  it("rejects a slot with a URL but no name", () => {
    expect(() =>
      parseRssSettingsForm(formData({ source4Url: "https://example.com/feed" })),
    ).toThrow("Source 4 needs both a name and a URL");
  });

  it("rejects an invalid URL", () => {
    expect(() =>
      parseRssSettingsForm(formData({ source1Name: "Bad", source1Url: "not a url" })),
    ).toThrow('Source 1\'s URL isn\'t valid: "not a url"');
  });

  it("rejects a non-http(s) URL scheme", () => {
    expect(() =>
      parseRssSettingsForm(
        formData({ source1Name: "Bad scheme", source1Url: "ftp://example.com/feed" }),
      ),
    ).toThrow("Source 1's URL must start with http:// or https://");
  });

  it("rejects a non-integer or non-positive priority", () => {
    expect(() =>
      parseRssSettingsForm(
        formData({ source1Name: "A", source1Url: "https://example.com/a", source1Priority: "0" }),
      ),
    ).toThrow("Source 1's priority must be a positive whole number");

    expect(() =>
      parseRssSettingsForm(
        formData({
          source1Name: "A",
          source1Url: "https://example.com/a",
          source1Priority: "1.5",
        }),
      ),
    ).toThrow("Source 1's priority must be a positive whole number");
  });

  it("rejects an entirely empty form (no filled slots)", () => {
    expect(() => parseRssSettingsForm(formData({}))).toThrow("Add at least one feed source");
  });

  it("ignores slots beyond MAX_SOURCE_SLOTS if somehow present in the form", () => {
    const result = parseRssSettingsForm(
      formData({
        source1Name: "A",
        source1Url: "https://example.com/a",
        source99Name: "Ignored",
        source99Url: "https://example.com/ignored",
      }),
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0]!.name).toBe("A");
  });
});
