"use client";

import { useActionState, useState } from "react";
import { Undo2 } from "lucide-react";
import type { WidgetActionState } from "@pulse/sdk";
import { useUndoableDelete } from "@pulse/ui";
import type { ReadingWidgetActions } from "./actions";
import { StartBookForm } from "./start-book-form";
import type { ReadingBook } from "./types";
import { UpdateProgressForm } from "./update-progress-form";

const initialState: WidgetActionState = {};

/**
 * Client subcomponent so the "New book" toggle and the clear-with-undo
 * flow can hold local state — the server ReadingComponent just passes
 * book/actions through.
 */
export function ReadingBody({
  book,
  actions,
}: {
  book: ReadingBook | null;
  actions: ReadingWidgetActions;
}) {
  const [mode, setMode] = useState<"progress" | "newBook">("progress");
  const [, clearFormAction] = useActionState(actions.clearBook, initialState);
  const {
    pending: pendingClear,
    requestDelete: requestClear,
    undo: undoClear,
    formRef: clearFormRef,
  } = useUndoableDelete();

  if (!book || mode === "newBook") {
    return (
      <div className="flex flex-col gap-2">
        {book && (
          <button
            type="button"
            onClick={() => setMode("progress")}
            className="self-start text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            ← Back to current book
          </button>
        )}
        <StartBookForm action={actions.startBook} onStarted={() => setMode("progress")} />
      </div>
    );
  }

  if (pendingClear) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm text-[var(--color-neutral-500)]">
        <span className="truncate">&ldquo;{book.title}&rdquo; cleared</span>
        <button
          type="button"
          onClick={undoClear}
          className="flex min-h-11 shrink-0 items-center gap-1.5 px-2 text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo
        </button>
        <form ref={clearFormRef} action={clearFormAction} className="hidden" />
      </div>
    );
  }

  const percent = Math.min(100, Math.round((book.currentPage / book.totalPage) * 100));

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="truncate font-medium text-[var(--foreground)]">{book.title}</p>
        {book.author && (
          <p className="truncate text-xs text-[var(--color-neutral-500)]">{book.author}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-[var(--color-neutral-500)]">
          Page {book.currentPage} / {book.totalPage} ({percent}%)
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--color-divider)]">
          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <UpdateProgressForm action={actions.updateProgress} currentPage={book.currentPage} />

      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setMode("newBook")}
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          New book
        </button>
        <button
          type="button"
          onClick={requestClear}
          className="font-medium text-[var(--color-neutral-500)] hover:underline"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
