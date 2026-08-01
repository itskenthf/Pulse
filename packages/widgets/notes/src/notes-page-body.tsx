"use client";

import { useState } from "react";
import type { WidgetAction } from "@pulse/sdk";
import { EmptyState } from "@pulse/ui";
import { NoteListRow } from "./note-list-row";
import { NoteModal } from "./note-modal";
import type { Note } from "./types";

type ModalMode = { type: "closed" } | { type: "create" } | { type: "edit"; note: Note };

/**
 * The /notes page's interactive shell: a clean, read-only row list plus
 * a "+ New note" button, both opening the same NoteModal (create or
 * edit mode) rather than always-inline editable forms — see
 * docs/DECISIONS.md's dashboard-polish entry for why.
 */
export function NotesPageBody({
  notes,
  actions,
}: {
  notes: Note[];
  actions: { addNote: WidgetAction; updateNote: WidgetAction; deleteNote: WidgetAction };
}) {
  const [mode, setMode] = useState<ModalMode>({ type: "closed" });

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setMode({ type: "create" })}
        className="min-h-11 self-start rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]"
      >
        + New note
      </button>

      {notes.length === 0 ? (
        <EmptyState message="No notes yet — click “+ New note” above." />
      ) : (
        <div className="flex flex-col divide-y divide-[var(--color-divider)]">
          {notes.map((note) => (
            <NoteListRow key={note.id} note={note} onClick={() => setMode({ type: "edit", note })} />
          ))}
        </div>
      )}

      <NoteModal
        open={mode.type !== "closed"}
        onClose={() => setMode({ type: "closed" })}
        note={mode.type === "edit" ? mode.note : undefined}
        addAction={actions.addNote}
        updateAction={actions.updateNote}
        deleteAction={actions.deleteNote}
      />
    </div>
  );
}
