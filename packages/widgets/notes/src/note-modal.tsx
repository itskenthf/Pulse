"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Modal } from "@pulse/ui";
import type { Note } from "./types";

const initialState: WidgetActionState = {};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

/**
 * One modal for both create and edit — `note` present means edit
 * (prefilled, Save via `updateAction`, a Delete button, timestamps
 * shown); `note` absent means create (empty fields, Save via
 * `addAction`, no delete/timestamps). See docs/DECISIONS.md's
 * dashboard-polish entry for why this replaced always-inline note
 * editing on /notes.
 */
export function NoteModal({
  open,
  onClose,
  note,
  addAction,
  updateAction,
  deleteAction,
}: {
  open: boolean;
  onClose: () => void;
  note?: Note;
  addAction: WidgetAction;
  updateAction: WidgetAction;
  deleteAction: WidgetAction;
}) {
  const isEdit = Boolean(note);
  const formRef = useRef<HTMLFormElement>(null);

  const [addState, addFormAction, addPending] = useActionState(addAction, initialState);
  const [updateState, updateFormAction, updatePending] = useActionState(updateAction, initialState);
  const [, deleteFormAction, deletePending] = useActionState(deleteAction, initialState);

  const saveFormAction = isEdit ? updateFormAction : addFormAction;
  const isSaving = isEdit ? updatePending : addPending;
  const saveError = isEdit ? updateState?.error : addState?.error;

  const wasAddPending = useRef(false);
  useEffect(() => {
    if (wasAddPending.current && !addPending && !addState?.error) onClose();
    wasAddPending.current = addPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose intentionally excluded, see NotebookInput's identical pattern
  }, [addPending, addState?.error]);

  const wasDeletePending = useRef(false);
  useEffect(() => {
    if (wasDeletePending.current && !deletePending) onClose();
    wasDeletePending.current = deletePending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletePending]);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit note" : "New note"}>
      <div className="flex flex-col gap-3">
        <form ref={formRef} action={saveFormAction} className="flex flex-col gap-3">
          {isEdit && <input type="hidden" name="noteId" value={note!.id} />}
          <input
            name="title"
            placeholder="Note title"
            defaultValue={note?.title}
            required
            disabled={isSaving}
            className="min-h-11 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--foreground)] placeholder:font-normal placeholder:text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
          />
          <textarea
            name="body"
            placeholder="Write something..."
            defaultValue={note?.body}
            rows={6}
            disabled={isSaving}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            className="rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
          />
          {note && (
            <p className="text-xs text-[var(--color-neutral-400)]">
              Created {DATE_FORMATTER.format(new Date(note.createdAt))}
              {note.updatedAt !== note.createdAt &&
                ` · Edited ${DATE_FORMATTER.format(new Date(note.updatedAt))}`}
            </p>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 self-start rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
        </form>
        {isEdit && (
          <form action={deleteFormAction} className="self-end">
            <input type="hidden" name="noteId" value={note!.id} />
            <button
              type="submit"
              disabled={deletePending}
              aria-label={`Delete "${note!.title}"`}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
