import { ensureWidgetRegistered, listBooks } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { ReadingData } from "./types";

/**
 * Same as Tasks/Notes — no external API, "fetching" just means reading the
 * user's own `reading` rows. The scheduler still calls this on the normal
 * cron cadence as a self-healing backstop; the write actions in
 * apps/web/src/app/actions/reading.ts call `refreshWidget` right after
 * every write so the dashboard reflects a change instantly.
 */
export async function fetchReadingData(context: WidgetFetchContext): Promise<ReadingData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const books = await listBooks(context.userId);

  return { books, fetchedAt: new Date().toISOString() };
}
