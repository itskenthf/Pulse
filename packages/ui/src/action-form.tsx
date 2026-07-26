"use client";

import { useActionState, useEffect, useRef } from "react";
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
   *  aria-label/title) instead of the default text button — used
   *  standalone (Hero). "menu" renders a full-width left-aligned row
   *  matching a dropdown menu item — used inside WidgetMenu. "Save"-style
   *  actions keep the default text variant. */
  variant?: "text" | "icon" | "menu";
  /** Leading icon for the "menu" row variant — ignored by other variants
   *  ("icon" always uses its own refresh glyph). */
  icon?: ReactNode;
  /** Called once the action settles without error — used by WidgetMenu to
   *  close the dropdown after a successful refresh. */
  onSubmitted?: () => void;
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
  icon,
  onSubmitted,
}: ActionFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      onSubmitted?.();
    }
    wasPending.current = isPending;
  }, [isPending, state?.error, onSubmitted]);

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
            ? `flex h-11 w-11 items-center justify-center rounded-full border border-current/20 text-current hover:bg-current/10 disabled:opacity-50 ${SPRING_PRESS}`
            : variant === "menu"
              ? "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] disabled:opacity-50"
              : `min-h-11 rounded-xl border border-current/20 px-3 py-1.5 text-xs font-medium text-current hover:bg-current/10 disabled:opacity-50 ${SPRING_PRESS}`
        }
      >
        {variant === "icon" ? (
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        ) : variant === "menu" ? (
          <>
            {icon}
            {isPending ? "…" : submitLabel}
          </>
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
