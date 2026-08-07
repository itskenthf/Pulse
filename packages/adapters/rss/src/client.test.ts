import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeed } from "./client";

const RSS_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Blog</title>
    <item>
      <title>First post</title>
      <link>https://example.com/first</link>
      <pubDate>Mon, 27 Jul 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>2026</title>
      <link>https://example.com/numeric-title</link>
      <pubDate>Tue, 28 Jul 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom Feed</title>
  <entry>
    <title>Atom post</title>
    <link rel="self" href="https://example.com/self" />
    <link rel="alternate" href="https://example.com/atom-post" />
    <updated>2026-07-27T12:00:00Z</updated>
  </entry>
</feed>`;

function mockFetchOnce(body: string, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      text: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchFeed", () => {
  it("parses RSS 2.0 items", async () => {
    mockFetchOnce(RSS_SAMPLE);
    const feed = await fetchFeed("https://example.com/rss.xml");
    expect(feed.items).toHaveLength(2);
    expect(feed.items[0]).toEqual({
      title: "First post",
      link: "https://example.com/first",
      publishedAt: new Date("2026-07-27T12:00:00Z").toISOString(),
    });
  });

  it("keeps a numeric-looking title as a string, not a coerced number", async () => {
    mockFetchOnce(RSS_SAMPLE);
    const feed = await fetchFeed("https://example.com/rss.xml");
    expect(feed.items[1]!.title).toBe("2026");
  });

  it("parses Atom entries, preferring the alternate link over self", async () => {
    mockFetchOnce(ATOM_SAMPLE);
    const feed = await fetchFeed("https://example.com/atom.xml");
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toEqual({
      title: "Atom post",
      link: "https://example.com/atom-post",
      publishedAt: new Date("2026-07-27T12:00:00Z").toISOString(),
    });
  });

  it("throws on a non-ok response", async () => {
    mockFetchOnce("", false);
    await expect(fetchFeed("https://example.com/rss.xml")).rejects.toThrow("Feed request failed");
  });

  it("throws on an unrecognized format", async () => {
    mockFetchOnce("<html><body>not a feed</body></html>");
    await expect(fetchFeed("https://example.com/rss.xml")).rejects.toThrow(
      "Unrecognized feed format",
    );
  });
});
