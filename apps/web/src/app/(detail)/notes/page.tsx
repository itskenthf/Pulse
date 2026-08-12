import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readWidgetCache } from "@pulse/database";
import { NOTES_WIDGET_ID, NotesPageBody, noteDataSchema } from "@pulse/widget-notes";
import { auth } from "@/auth";
import { addNoteAction, deleteNoteAction, updateNoteAction } from "@/app/actions/notes";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const cached = await readWidgetCache(session.user.id, NOTES_WIDGET_ID, noteDataSchema);
  const notes = cached?.data.notes ?? [];

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Notes
      </h1>

      <NotesPageBody
        notes={notes}
        actions={{
          addNote: addNoteAction,
          updateNote: updateNoteAction,
          deleteNote: deleteNoteAction,
        }}
      />
    </>
  );
}
