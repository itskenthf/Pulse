"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";

export interface ActionFormProps {
  action: WidgetAction;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  /** "icon" renders a minimal icon-only refresh button (label moves to
   *  aria-label/title) instead of the default text button — used for the
   *  refresh action; "Save"-style actions keep the text variant. */
  variant?: "text" | "icon";
}

const initialState: WidgetActionState = {};

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${spinning ? "animate-spin" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

/**
 * Generic form wiring for a widget action (refresh, save settings, ...):
 * pending state on the submit button, error rendering. Every widget reuses
 * this instead of hand-rolling useActionState per action.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  variant = "text",
}: ActionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={className}>
      {children}
      <button
        type="submit"
        disabled={isPending}
        aria-label={submitLabel}
        title={submitLabel}
        className={
          variant === "icon"
            ? "rounded-full border border-current p-1.5 text-current hover:bg-current/10 disabled:opacity-50"
            : "rounded-md border border-current px-2 py-1 text-xs font-medium text-current hover:bg-current/10 disabled:opacity-50"
        }
      >
        {variant === "icon" ? <RefreshIcon spinning={isPending} /> : isPending ? "…" : submitLabel}
      </button>
      {state?.error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
