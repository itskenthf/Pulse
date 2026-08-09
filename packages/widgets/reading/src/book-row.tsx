"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, Trash2, Undo2 } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { useUndoableDelete } from "@pulse/ui";
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
      <div className="flex items-center justify-between gap-2 py-2 text-sm text-[var(--color-neutral-500)]">
        <span className="truncate">&ldquo;{book.title}&rdquo; deleted</span>
        <button
          type="button"
          onClick={undo}
          className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo
        </button>
        <form ref={deleteFormRef} action={deleteFormAction} className="hidden">
          <input type="hidden" name="bookId" value={book.id} />
        </form>
      </div>
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
        <button
          type="button"
          onClick={requestDelete}
          aria-label={`Delete "${book.title}"`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-current/10 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
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
                className="min-h-11 w-24 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={isUpdating}
                className="min-h-11 rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
              >
                Update
              </button>
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
