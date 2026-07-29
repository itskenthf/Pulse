import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readWidgetCache } from "@pulse/database";
import { EmptyState } from "@pulse/ui";
import { AddNoteForm, NOTES_WIDGET_ID, noteDataSchema } from "@pulse/widget-notes";
import { auth } from "@/auth";
import { addNoteAction, deleteNoteAction, updateNoteAction } from "@/app/actions/notes";
import { NoteEditor } from "./note-editor";

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const cached = await readWidgetCache(session.user.id, NOTES_WIDGET_ID, noteDataSchema);
  const notes = cached?.data.notes ?? [];

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
          Notes
        </h1>

        <AddNoteForm action={addNoteAction} />

        {notes.length === 0 ? (
          <EmptyState message="No notes yet — write one above." />
        ) : (
          <div className="flex flex-col gap-4">
            {notes.map((note) => (
              <NoteEditor
                key={note.id}
                note={note}
                updateAction={updateNoteAction}
                deleteAction={deleteNoteAction}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
