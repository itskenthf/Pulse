"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { SPRING_PRESS } from "./glass";

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
            ? `flex h-8 w-8 items-center justify-center rounded-full border border-current/20 text-current hover:bg-current/10 disabled:opacity-50 ${SPRING_PRESS}`
            : `rounded-xl border border-current/20 px-3 py-1.5 text-xs font-medium text-current hover:bg-current/10 disabled:opacity-50 ${SPRING_PRESS}`
        }
      >
        {variant === "icon" ? (
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        ) : isPending ? (
          "…"
        ) : (
          submitLabel
        )}
      </button>
      {state?.error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
