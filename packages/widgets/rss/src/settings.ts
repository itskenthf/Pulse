import { DEFAULT_RSS_SOURCES } from "./constants";
import type { RssSettings, RssSource } from "./types";

/** Fixed-slot form size — see `parseRssSettingsForm`'s own doc comment
 *  for why fixed slots instead of a dynamic add/remove list. */
export const MAX_SOURCE_SLOTS = 6;

export const defaultRssSettings: RssSettings = {
  sources: DEFAULT_RSS_SOURCES,
};

/**
 * Fixed-slot form (`source1Name`/`source1Url`/`source1Priority` …
 * `source6…`) rather than a dynamic add/remove list — same plain-
 * form-fields pattern every other widget with settings uses (see
 * Steam's own settings.ts), no new client-side array-editing UI
 * needed. A slot with a blank name and URL is treated as unused and
 * skipped; a slot with only one of the two filled is a mistake, not a
 * silent partial entry, so that throws. Requires at least one filled
 * slot — an entirely empty source list would just be a permanently-
 * empty widget with no way back to defaults short of re-typing them.
 */
export function parseRssSettingsForm(formData: FormData): RssSettings {
  const sources: RssSource[] = [];

  for (let slot = 1; slot <= MAX_SOURCE_SLOTS; slot++) {
    const nameField = formData.get(`source${slot}Name`);
    const urlField = formData.get(`source${slot}Url`);
    const priorityField = formData.get(`source${slot}Priority`);

    const name = typeof nameField === "string" ? nameField.trim() : "";
    const url = typeof urlField === "string" ? urlField.trim() : "";
    if (!name && !url) continue;

    if (!name || !url) {
      throw new Error(`Source ${slot} needs both a name and a URL`);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error(`Source ${slot}'s URL isn't valid: "${url}"`);
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(`Source ${slot}'s URL must start with http:// or https://`);
    }

    const priorityText = typeof priorityField === "string" ? priorityField.trim() : "";
    const priority = priorityText ? Number(priorityText) : 1;
    if (!Number.isInteger(priority) || priority < 1) {
      throw new Error(`Source ${slot}'s priority must be a positive whole number`);
    }

    sources.push({ name, url, priority });
  }

  if (sources.length === 0) {
    throw new Error("Add at least one feed source");
  }

  return { sources };
}
