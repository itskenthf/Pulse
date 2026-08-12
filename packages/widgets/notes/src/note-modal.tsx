"use client";

import { useActionState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS, IconButton, Modal, UndoableDeleteRow, useUndoableDelete } from "@pulse/ui";
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
  const { pending: pendingDelete, requestDelete, undo, formRef: deleteFormRef } = useUndoableDelete();

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
        {pendingDelete ? (
          <UndoableDeleteRow
            label={<>&ldquo;{note?.title}&rdquo; deleted</>}
            onUndo={undo}
            formRef={deleteFormRef}
            deleteAction={deleteFormAction}
          >
            {note && <input type="hidden" name="noteId" value={note.id} />}
          </UndoableDeleteRow>
        ) : (
          <>
            <form ref={formRef} action={saveFormAction} className="flex flex-col gap-3">
              {isEdit && <input type="hidden" name="noteId" value={note!.id} />}
              <input
                name="title"
                placeholder="Note title"
                defaultValue={note?.title}
                required
                disabled={isSaving}
                className={`${FIELD_CLASS} font-medium placeholder:font-normal`}
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
                className={FIELD_CLASS}
              />
              {note && (
                <p className="text-xs text-[var(--color-neutral-400)]">
                  Created {DATE_FORMATTER.format(new Date(note.createdAt))}
                  {note.updatedAt !== note.createdAt &&
                    ` · Edited ${DATE_FORMATTER.format(new Date(note.updatedAt))}`}
                </p>
              )}
              <Button type="submit" disabled={isSaving} className="self-start">
                {isSaving ? "Saving…" : "Save"}
              </Button>
              {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            </form>
            {isEdit && (
              <IconButton
                onClick={requestDelete}
                aria-label={`Delete "${note!.title}"`}
                className="self-end"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </IconButton>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
