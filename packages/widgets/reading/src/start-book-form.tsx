"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";

const initialState: WidgetActionState = {};

const FIELD_CLASS =
  "min-h-11 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--color-neutral-400)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none";

/** The infrequent form — title/author/total pages. Used both for the
 *  empty state (no current book) and the "New book" toggle. */
export function StartBookForm({
  action,
  onStarted,
}: {
  action: WidgetAction;
  onStarted?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
      onStarted?.();
    }
    wasPending.current = isPending;
  }, [isPending, state?.error, onStarted]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input name="title" placeholder="Book title" required disabled={isPending} className={FIELD_CLASS} />
      <input name="author" placeholder="Author (optional)" disabled={isPending} className={FIELD_CLASS} />
      <input
        name="totalPage"
        type="number"
        min={1}
        placeholder="Total pages"
        required
        disabled={isPending}
        className={FIELD_CLASS}
      />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
      >
        Start reading
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
