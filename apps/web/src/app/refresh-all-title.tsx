"use client";

import { useActionState, useState } from "react";
import type { WidgetActionState } from "@pulse/sdk";
import { refreshAllWidgetsAction } from "./actions/widgets";

const initialState: WidgetActionState = {};

const LOGO_MASK_STYLE = {
  maskImage: "url(/logo-pulse.png)",
  WebkitMaskImage: "url(/logo-pulse.png)",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  maskSize: "contain",
  WebkitMaskSize: "contain",
} as const;

/**
 * The Pulse logo mark itself is the global refresh control — single-user
 * app, per Ken's explicit request not to add a separate icon button. Pending
 * state is a subtle opacity dip rather than a spinner, keeping this a plain
 * mark visually until it's actually doing something.
 *
 * The mark is rendered as a CSS `mask-image` (the source PNG's alpha
 * channel only) painted with `background-color`, not a plain `<img>` —
 * that's what lets "hover lights it up gold" be a literal color change
 * on the wordmark itself, in both light and dark mode, without a second
 * hand-authored asset. `active` (hover or keyboard focus) drives the lit
 * color, sustained for as long as the cursor/focus stays; `tapPulse`
 * gives touch devices — which never get a real hover state — an
 * equivalent moment, firing on tap and clearing itself shortly after.
 *
 * The <h1> lives inside the <form> (wrapping only the button) rather than
 * around it: <h1> takes phrasing content, and <form>/<p> are flow content,
 * so the other nesting is invalid HTML.
 */
export function RefreshAllTitle() {
  const [state, formAction, isPending] = useActionState(refreshAllWidgetsAction, initialState);
  const [active, setActive] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);
  const lit = active || tapPulse;

  return (
    <form action={formAction}>
      <h1>
        <button
          type="submit"
          disabled={isPending}
          aria-label="Pulse, refresh all widgets"
          title="Refresh all widgets"
          onMouseEnter={() => setActive(true)}
          onMouseLeave={() => setActive(false)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          onClick={() => {
            setTapPulse(true);
            window.setTimeout(() => setTapPulse(false), 900);
          }}
          className={`inline-flex transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            isPending ? "opacity-60" : "opacity-100"
          }`}
        >
          <span
            aria-hidden="true"
            style={LOGO_MASK_STYLE}
            className={`inline-block aspect-[900/661] h-10 sm:h-12 lg:h-16 transition-colors duration-300 ease-out motion-reduce:transition-none ${
              lit ? "bg-[var(--color-accent)]" : "bg-[var(--foreground)]"
            }`}
          />
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
