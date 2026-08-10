import { MAX_TITLES_PER_SOURCE } from "./constants";
import type { DigestEntry } from "./types";

export interface MemoryLike {
  /** Already resolved to a display label (e.g. "GitHub") — `fetch.ts`
   *  resolves this via the widget registry's own `WIDGET_NAME`
   *  (`getWidget(source)?.name`) before calling this function, so
   *  labels never drift from each widget's own canonical name. */
  source: string;
  title: string;
  /** Already resolved to the user's local "YYYY-MM-DD" — kept as a plain
   *  field rather than a raw timestamp so this function stays a pure,
   *  time-zone-agnostic grouping step; `fetch.ts` does the
   *  `todayInTimeZone` resolution before calling this. */
  dateStr: string;
}

/**
 * Groups today's memories by source, sorted busiest-source-first (ties
 * broken alphabetically for a stable, deterministic order). Titles
 * beyond `MAX_TITLES_PER_SOURCE` are dropped from the preview list —
 * `count` still reflects the real total, so the card can say "+N more".
 */
export function groupTodaysMemories(memories: MemoryLike[], todayStr: string): DigestEntry[] {
  const bySource = new Map<string, string[]>();

  for (const memory of memories) {
    if (memory.dateStr !== todayStr) continue;
    const titles = bySource.get(memory.source) ?? [];
    titles.push(memory.title);
    bySource.set(memory.source, titles);
  }

  return Array.from(bySource.entries())
    .map(([source, titles]) => ({
      source,
      count: titles.length,
      titles: titles.slice(0, MAX_TITLES_PER_SOURCE),
    }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
}
