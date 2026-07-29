"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import type { Note } from "@pulse/widget-notes";
import { glassClass, RADIUS } from "@pulse/ui";

const initialState: WidgetActionState = {};

export function NoteEditor({
  note,
  updateAction,
  deleteAction,
}: {
  note: Note;
  updateAction: WidgetAction;
  deleteAction: WidgetAction;
}) {
  const [updateState, updateFormAction, isSaving] = useActionState(updateAction, initialState);
  const [, deleteFormAction, isDeleting] = useActionState(deleteAction, initialState);

  return (
    <div className={`flex flex-col gap-2 ${RADIUS.card} p-4 ${glassClass("light")}`}>
      <form action={updateFormAction} className="flex flex-col gap-2">
        <input type="hidden" name="noteId" value={note.id} />
        <input
          name="title"
          defaultValue={note.title}
          className="min-h-11 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--foreground)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
        />
        <textarea
          name="body"
          defaultValue={note.body}
          rows={4}
          className="rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          {updateState?.error && <p className="text-xs text-red-600">{updateState.error}</p>}
        </div>
      </form>
      <form action={deleteFormAction} className="self-end">
        <input type="hidden" name="noteId" value={note.id} />
        <button
          type="submit"
          disabled={isDeleting}
          aria-label={`Delete "${note.title}"`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
