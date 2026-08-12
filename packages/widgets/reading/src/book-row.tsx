"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS, IconButton, UndoableDeleteRow, useUndoableDelete } from "@pulse/ui";
import type { ReadingBook } from "./types";

const initialState: WidgetActionState = {};

function formatFinishedDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A single book on /reading — progress controls + "Mark finished" while
 *  status is "reading", just a finished date once it isn't. Delete is
 *  available either way, with the same undo-window Tasks/Notes rows use. */
export function BookRow({
  book,
  updateProgressAction,
  markFinishedAction,
  deleteAction,
}: {
  book: ReadingBook;
  updateProgressAction: WidgetAction;
  markFinishedAction: WidgetAction;
  deleteAction: WidgetAction;
}) {
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateProgressAction,
    initialState,
  );
  const [, finishFormAction, isFinishing] = useActionState(markFinishedAction, initialState);
  const [, deleteFormAction] = useActionState(deleteAction, initialState);
  const finishFormRef = useRef<HTMLFormElement>(null);
  const { pending: pendingDelete, requestDelete, undo, formRef: deleteFormRef } = useUndoableDelete();

  if (pendingDelete) {
    return (
      <UndoableDeleteRow
        label={<>&ldquo;{book.title}&rdquo; deleted</>}
        onUndo={undo}
        formRef={deleteFormRef}
        deleteAction={deleteFormAction}
      >
        <input type="hidden" name="bookId" value={book.id} />
      </UndoableDeleteRow>
    );
  }

  const percent = Math.min(100, Math.round((book.currentPage / book.totalPage) * 100));

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--foreground)]">{book.title}</p>
          {book.author && (
            <p className="truncate text-xs text-[var(--color-neutral-500)]">{book.author}</p>
          )}
        </div>
        <IconButton onClick={requestDelete} aria-label={`Delete "${book.title}"`}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
      </div>

      {book.status === "reading" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-[var(--color-neutral-500)]">
              Page {book.currentPage} / {book.totalPage} ({percent}%)
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--color-divider)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent)]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form action={updateFormAction} className="flex items-center gap-2">
              <input type="hidden" name="bookId" value={book.id} />
              <input
                key={book.currentPage}
                name="currentPage"
                type="number"
                min={0}
                defaultValue={book.currentPage}
                disabled={isUpdating}
                aria-label={`Current page for "${book.title}"`}
                className={`w-24 ${FIELD_CLASS}`}
              />
              <Button type="submit" disabled={isUpdating}>
                Update
              </Button>
            </form>
            {updateState?.error && <p className="text-xs text-red-600">{updateState.error}</p>}

            <form ref={finishFormRef} action={finishFormAction}>
              <input type="hidden" name="bookId" value={book.id} />
              <button
                type="submit"
                disabled={isFinishing}
                className="flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Mark finished
              </button>
            </form>
          </div>
        </>
      ) : (
        <p className="text-xs text-[var(--color-neutral-500)]">
          {book.finishedAt ? `Finished ${formatFinishedDate(book.finishedAt)}` : "Finished"}
        </p>
      )}
    </div>
  );
}
