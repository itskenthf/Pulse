"use client";

import { useActionState } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";

const initialState: WidgetActionState = {};

/** The daily-use form — just the current page. Separate from
 *  StartBookForm since this is the one actually used often. */
export function UpdateProgressForm({
  action,
  currentPage,
}: {
  action: WidgetAction;
  currentPage: number;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        key={currentPage}
        name="currentPage"
        type="number"
        min={0}
        defaultValue={currentPage}
        disabled={isPending}
        aria-label="Current page"
        className="min-h-11 w-24 rounded-[4px] border border-[var(--color-divider)] bg-transparent px-3 py-2 text-sm text-[var(--foreground)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-[4px] border border-[var(--color-accent)] px-3 text-sm font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
      >
        Update
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
