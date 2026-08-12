import { fetchWithRetry } from "@pulse/http";
import { XMLParser } from "fast-xml-parser";

export interface NormalizedFeedItem {
  title: string;
  link: string;
  /** ISO string. Falls back to the epoch when a feed omits or mangles
   *  its date — sorts to the bottom rather than crashing the merge. */
  publishedAt: string;
}

export interface NormalizedFeed {
  items: NormalizedFeedItem[];
}

// parseTagValue: false — a title that happens to look numeric (e.g. a
// post literally called "2026") would otherwise get silently coerced to
// a number by the parser's type-inference, which our string-shaped
// normalization below isn't expecting.
//
// stopNodes — some feeds (Steam's per-app news, in particular) pack a
// full HTML-escaped post body into description/content fields, which
// can contain thousands of entities in one node and trip
// fast-xml-parser's anti-XML-bomb entity-expansion cap ("Entity
// expansion limit exceeded: N > 1000"), failing the whole parse. We
// never read those fields (only title/link/pubDate), so stopNodes tells
// the parser to keep them as raw, un-decoded text instead of fully
// processing their entities.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  stopNodes: ["*.description", "*.summary", "*.content", "*.content:encoded"],
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDate(value: unknown): string {
  if (typeof value !== "string") return new Date(0).toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

interface AtomLinkAttrs {
  "@_href"?: string;
  "@_rel"?: string;
}

/** Atom entries can have multiple <link> elements (alternate, self, …);
 *  RSS/plain feeds just use link as a text node. */
function extractAtomLink(link: unknown): string {
  if (typeof link === "string") return link;
  const links = toArray(link as AtomLinkAttrs | AtomLinkAttrs[]);
  const alternate = links.find((entry) => !entry["@_rel"] || entry["@_rel"] === "alternate");
  const href = (alternate ?? links[0])?.["@_href"];
  return typeof href === "string" ? href : "";
}

/**
 * Normalizes RSS 2.0 and Atom into one shape — feeds are inconsistent
 * about field names (`pubDate` vs `updated`/`published`, `link` as a
 * text node vs an attribute), so every caller deals with one shape
 * instead of re-deriving this per feed.
 */
export async function fetchFeed(url: string, signal?: AbortSignal): Promise<NormalizedFeed> {
  // Some feed hosts reject requests with no User-Agent or an obviously
  // non-browser one (a bare Node/undici default) — sending a normal
  // browser-looking one avoids that class of false "feed is down".
  const response = await fetchWithRetry(url, {
    signal,
    headers: {
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      "User-Agent":
        "Mozilla/5.0 (compatible; PulseRSS/1.0; +https://github.com/itskenthf/Pulse)",
    },
  });
  if (!response.ok) {
    throw new Error(`Feed request failed (${response.status}): ${url}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as Record<string, unknown>;

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  if (channel) {
    const items = toArray(channel.item as Record<string, unknown> | Record<string, unknown>[]);
    return {
      items: items.map((item) => ({
        title: typeof item.title === "string" ? item.title : "Untitled",
        link: typeof item.link === "string" ? item.link : "",
        publishedAt: parseDate(item.pubDate),
      })),
    };
  }

  const feed = parsed.feed as Record<string, unknown> | undefined;
  if (feed) {
    const entries = toArray(feed.entry as Record<string, unknown> | Record<string, unknown>[]);
    return {
      items: entries.map((entry) => ({
        title: typeof entry.title === "string" ? entry.title : "Untitled",
        link: extractAtomLink(entry.link),
        publishedAt: parseDate(entry.updated ?? entry.published),
      })),
    };
  }

  throw new Error(`Unrecognized feed format: ${url}`);
}
