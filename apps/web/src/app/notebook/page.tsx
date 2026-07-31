import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listNotebookEntries } from "@pulse/database";
import { NOTEBOOK_WIDGET_ID, NotebookEntryList, NotebookInput } from "@pulse/widget-notebook";
import { auth } from "@/auth";
import { addEntryAction, updateEntryAction } from "@/app/actions/notebook";
import { refreshWidgetAction } from "@/app/actions/widgets";

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
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Notebook
        </h1>

        <NotebookInput
          actions={{
            refresh: refreshWidgetAction.bind(null, NOTEBOOK_WIDGET_ID),
            addEntry: addEntryAction,
            updateEntry: updateEntryAction,
          }}
          onPendingChange={() => {}}
        />

        <NotebookEntryList entries={entries} />
      </main>
    </div>
  );
}
