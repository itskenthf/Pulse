"use client";

import { useState } from "react";
import { Book } from "lucide-react";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { NoteWidgetActions } from "./actions";
import { NoteModal } from "./note-modal";

/**
 * The dashboard card's compact trigger + "New note" modal — mirrors
 * NotebookCard's split of the widget's plain `component.tsx` entry point
 * from its actual client-interactive body. A button (not a focusable
 * `readOnly` input) opens `NoteModal` in create mode (no `note` prop),
 * the same modal `/notes` already uses for creating and editing —
 * `Modal`'s close effect always returns focus to whatever triggered it,
 * so an `onFocus`-driven input would refocus itself on close and
 * immediately reopen; a `button` (like `/notes`'s own "+ New note"
 * trigger) doesn't have that problem, since returning focus to it after
 * close is a no-op.
 */
export function NotesCard({ actions }: { actions: NoteWidgetActions }) {
  const [open, setOpen] = useState(false);

  return (
    <WidgetCard
      title="Notes"
      icon={<Book className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="notes" actions={actions} />}
      compact
      footer={
        <a
          href="/notes"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View all →
        </a>
      }
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-left text-sm text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
      >
        Write a note...
      </button>
      <NoteModal
        open={open}
        onClose={() => setOpen(false)}
        addAction={actions.addNote}
        updateAction={actions.updateNote}
        deleteAction={actions.deleteNote}
      />
    </WidgetCard>
  );
}
