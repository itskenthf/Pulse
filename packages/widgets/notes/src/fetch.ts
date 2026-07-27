import { ensureWidgetRegistered, listNotes } from "@pulse/database";
import type { WidgetFetchContext } from "@pulse/sdk";
import { WIDGET_DESCRIPTION, WIDGET_ID, WIDGET_NAME } from "./constants";
import type { NoteData } from "./types";

/**
 * Same shape as the Tasks widget's fetch.ts: no external API, "fetching"
 * just means reading the user's own `notes` table. The write actions in
 * apps/web/src/app/actions/notes.ts call `refreshWidget` right after
 * every mutation so the dashboard reflects a change instantly.
 */
export async function fetchNoteData(context: WidgetFetchContext): Promise<NoteData> {
  await ensureWidgetRegistered(WIDGET_ID, WIDGET_NAME, WIDGET_DESCRIPTION);

  const notes = await listNotes(context.userId);

  return { notes, fetchedAt: new Date().toISOString() };
}
