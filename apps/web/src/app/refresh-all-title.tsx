"use client";

import { useActionState } from "react";
import type { WidgetActionState } from "@pulse/sdk";
import { refreshAllWidgetsAction } from "./actions/widgets";

const initialState: WidgetActionState = {};

/**
 * The Pulse logo mark itself is the global refresh control — single-user
 * app, per Ken's explicit request not to add a separate icon button. Pending
 * state is a subtle opacity dip rather than a spinner, keeping this a plain
 * mark visually until it's actually doing something. The hover/focus glow
 * is a deliberate one-off exception to the "no blur/colored shadow" rule in
 * docs/DESIGN_SYSTEM.md — see docs/DECISIONS.md — scoped to this single
 * control because it's the one element that's both the brand mark and a
 * global action, so it needs its own "this is clickable" cue.
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
          className={`inline-flex transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-none ${
            isPending
              ? "opacity-60"
              : "opacity-100 hover:drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent)_55%,transparent)] focus-visible:drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]"
          }`}
        >
          {/* Local static asset at a small fixed size — next/image's
              overhead isn't warranted, same call as profile-menu.tsx's avatar. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-pulse.png" alt="" aria-hidden="true" className="h-8 w-auto dark:invert" />
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
