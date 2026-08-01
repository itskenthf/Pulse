import { snippet } from "./snippet";
import type { Note } from "./types";

/** Compact, read-only row for the /notes list — click opens the detail/
 *  edit modal (see NotesPageBody). No inline delete; that moved into
 *  the modal alongside editing. */
export function NoteListRow({ note, onClick }: { note: Note; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-[4px] px-3 py-2 text-left hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
    >
      <p className="truncate text-sm font-medium text-[var(--foreground)]">{note.title}</p>
      {note.body.trim() && (
        <p className="truncate text-sm text-[var(--color-neutral-600)]">{snippet(note.body)}</p>
      )}
    </button>
  );
}
