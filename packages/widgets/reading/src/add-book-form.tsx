"use client";

import type { WidgetAction } from "@pulse/sdk";
import { Button, FIELD_CLASS, useResettableForm } from "@pulse/ui";

/** Lives on /reading only — title/author/total pages, resets on success
 *  like AddTaskForm. */
export function AddBookForm({ action }: { action: WidgetAction }) {
  const { state, formAction, isPending, formRef } = useResettableForm(action);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <input name="title" placeholder="Book title" required disabled={isPending} className={`flex-1 ${FIELD_CLASS}`} />
      <input name="author" placeholder="Author (optional)" disabled={isPending} className={`flex-1 ${FIELD_CLASS}`} />
      <input
        name="totalPage"
        type="number"
        min={1}
        placeholder="Total pages"
        required
        disabled={isPending}
        className={`w-full sm:w-32 ${FIELD_CLASS}`}
      />
      <Button type="submit" disabled={isPending} className="shrink-0">
        Add book
      </Button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
