"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";

export interface ActionFormProps {
  action: WidgetAction;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
}

const initialState: WidgetActionState = {};

/**
 * Generic form wiring for a widget action (refresh, save settings, ...):
 * pending state on the submit button, error rendering. Every widget reuses
 * this instead of hand-rolling useActionState per action.
 */
export function ActionForm({ action, submitLabel, children, className }: ActionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className}>
      {children}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md border border-current px-2 py-1 text-xs font-medium text-current hover:bg-current/10 disabled:opacity-50"
      >
        {isPending ? "…" : submitLabel}
      </button>
      {state?.error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
