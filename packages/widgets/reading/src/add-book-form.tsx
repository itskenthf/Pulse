"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS } from "@pulse/ui";

const initialState: WidgetActionState = {};

/** Lives on /reading only — title/author/total pages, resets on success
 *  like AddTaskForm. */
export function AddBookForm({ action }: { action: WidgetAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state?.error]);

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
