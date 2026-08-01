"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { snippet } from "./snippet";
import type { Note } from "./types";

const initialState: WidgetActionState = {};

export function NoteRow({ note, deleteAction }: { note: Note; deleteAction: WidgetAction }) {
  const [, deleteFormAction, isDeleting] = useActionState(deleteAction, initialState);

  return (
    <div className="flex items-start gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">{note.title}</p>
        {note.body.trim() && (
          <p className="truncate text-sm text-[var(--color-neutral-600)]">
            {snippet(note.body)}
          </p>
        )}
      </div>
      <form action={deleteFormAction}>
        <input type="hidden" name="noteId" value={note.id} />
        <button
          type="submit"
          disabled={isDeleting}
          aria-label={`Delete "${note.title}"`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
