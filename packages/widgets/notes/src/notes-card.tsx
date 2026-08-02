"use client";

import { useState } from "react";
import { Book } from "lucide-react";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { NoteWidgetActions } from "./actions";
import { NoteModal } from "./note-modal";

/**
 * The dashboard card's compact trigger + "New note" modal — mirrors
 * NotebookCard's split of the widget's plain `component.tsx` entry point
 * from its actual client-interactive body. Focusing the read-only input
 * opens `NoteModal` in create mode (no `note` prop), the same modal
 * `/notes` already uses for creating and editing.
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
      <input
        placeholder="Write a note..."
        readOnly
        onFocus={() => setOpen(true)}
        className="min-h-11 w-full cursor-text rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
      />
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
