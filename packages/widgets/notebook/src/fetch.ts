import { ensureWidgetRegistered, listNotebookEntries } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { RENDER_LIMIT, WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { NotebookData } from "./types";

/**
 * Same shape as the Notes/Tasks widgets' fetch.ts: no external API,
 * "fetching" just means reading the user's own `notebook_entries` table.
 * The write actions in apps/web/src/app/actions/notebook.ts call
 * `refreshWidget` right after every autosave so the dashboard reflects a
 * change instantly.
 */
export async function fetchNotebookData(context: WidgetFetchContext): Promise<NotebookData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const entries = await listNotebookEntries(context.userId, RENDER_LIMIT);

  return { entries, fetchedAt: new Date().toISOString() };
}
