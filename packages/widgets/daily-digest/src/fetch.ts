import { ensureWidgetRegistered, listMemories } from "@pulse/database";
import { todayInTimeZone } from "@pulse/health";
import { getWidget, type WidgetFetchContext } from "@pulse/sdk";
import { MEMORY_LOOKBACK, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import { groupTodaysMemories, type MemoryLike } from "./group";
import type { DailyDigestData } from "./types";

/** A memory's `source` is the emitting widget's own id — resolve it back
 *  to that widget's canonical `WIDGET_NAME` via the registry rather than
 *  hardcoding a second label map here, so a widget renaming itself never
 *  needs a matching update in this package. Falls back to the raw id for
 *  a source that isn't a registered widget (shouldn't happen in
 *  practice, but `getWidget` returning undefined is a real possibility
 *  the type system already models). */
function labelFor(source: string): string {
  return getWidget(source)?.name ?? source;
}

/**
 * No external API, no table of its own (Memory Roadmap M2 — see
 * docs/MEMORY_ROADMAP.md): reads the existing `memories` table (M1,
 * already powering the Timeline page) and groups today's rows by
 * source. Titles/counts only, not durations — see docs/DECISIONS.md's
 * entry for why a richer quantified digest ("2h on Steam") was scoped
 * out rather than built on top of unstructured description text.
 */
export async function fetchDailyDigestData(context: WidgetFetchContext): Promise<DailyDigestData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const memories = await listMemories(context.userId, MEMORY_LOOKBACK);
  const today = todayInTimeZone();

  const memoriesWithDate: MemoryLike[] = memories.map((memory) => ({
    source: labelFor(memory.source),
    title: memory.title,
    dateStr: todayInTimeZone(new Date(memory.createdAt)),
  }));

  return {
    entries: groupTodaysMemories(memoriesWithDate, today),
    fetchedAt: new Date().toISOString(),
  };
}
