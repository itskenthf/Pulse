import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listNotebookEntries } from "@pulse/database";
import { NOTEBOOK_WIDGET_ID, NotebookEntryList, NotebookInput } from "@pulse/widget-notebook";
import { auth } from "@/auth";
import { addEntryAction, updateEntryAction } from "@/app/actions/notebook";
import { refreshWidgetAction } from "@/app/actions/widgets";

export const metadata: Metadata = { title: "Notebook" };

/**
 * Full history view, mirroring /notes and /tasks. Reads `notebook_entries`
 * directly rather than via `readWidgetCache` — the widget's own cache
 * only ever holds the capped preview `fetchData()` reads (see
 * `packages/database/src/notebook.ts`'s `listNotebookEntries` doc
 * comment), so reusing it here would silently cap history at 10.
 */
export default async function NotebookPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const entries = await listNotebookEntries(session.user.id);

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Notebook
      </h1>

      <NotebookInput
        actions={{
          refresh: refreshWidgetAction.bind(null, NOTEBOOK_WIDGET_ID),
          addEntry: addEntryAction,
          updateEntry: updateEntryAction,
        }}
      />

      <NotebookEntryList entries={entries} />
    </>
  );
}
