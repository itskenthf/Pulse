"use client";

import { useActionState } from "react";
import type { WidgetActionState } from "@pulse/sdk";
import { refreshAllWidgetsAction } from "./actions/widgets";

const initialState: WidgetActionState = {};

/**
 * The "Pulse" wordmark itself is the global refresh control — single-user
 * app, per Ken's explicit request not to add a separate icon button. Pending
 * state is a subtle opacity dip on the text rather than a spinner, keeping
 * this a plain heading visually until it's actually doing something.
 *
 * The <h1> lives inside the <form> (wrapping only the button) rather than
 * around it: <h1> takes phrasing content, and <form>/<p> are flow content,
 * so the other nesting is invalid HTML.
 */
export function RefreshAllTitle() {
  const [state, formAction, isPending] = useActionState(refreshAllWidgetsAction, initialState);

  return (
    <form action={formAction}>
      <h1>
        <button
          type="submit"
          disabled={isPending}
          aria-label="Pulse, refresh all widgets"
          title="Refresh all widgets"
          className={`font-heading text-lg font-semibold tracking-tight text-[var(--foreground)] transition-opacity ${
            isPending ? "opacity-60" : "opacity-100 hover:opacity-80"
          }`}
        >
          Pulse
        </button>
      </h1>
      {state?.error && (
        <p className="mt-1 max-w-64 text-xs whitespace-pre-line text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
