import { Book } from "lucide-react";
import { EmptyState, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { NoteWidgetActions } from "./actions";
import { AddNoteForm } from "./add-note-form";
import { PREVIEW_NOTE_COUNT } from "./constants";
import { NoteRow } from "./note-row";
import type { NoteData } from "./types";

export function NotesComponent({
  data,
  actions,
}: WidgetRenderProps<NoteData, Record<string, unknown>, NoteWidgetActions>) {
  const recent = (data?.notes ?? []).slice(0, PREVIEW_NOTE_COUNT);

  return (
    <WidgetCard
      title="Notes"
      icon={<Book className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="notes" actions={actions} />}
    >
      <div className="flex flex-col gap-3">
        <AddNoteForm action={actions.addNote} />
        {recent.length > 0 ? (
          <div className="flex flex-col divide-y divide-[var(--color-divider)]">
            {recent.map((note) => (
              <NoteRow key={note.id} note={note} deleteAction={actions.deleteNote} />
            ))}
          </div>
        ) : (
          <EmptyState message="No notes yet — write one above." />
        )}
        <a
          href="/notes"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View all →
        </a>
      </div>
    </WidgetCard>
  );
}
