"use client";

import { useActionState, useState } from "react";
import type { WidgetActionState } from "@pulse/sdk";
import { refreshAllWidgetsAction } from "./actions/widgets";

const initialState: WidgetActionState = {};

/** A single four-point sparkle, positioned/delayed by its caller. Fades
 *  with the shared `active` state rather than its own hover — mobile has
 *  no hover to key off, so hover/focus/tap all funnel into one state. */
function Sparkle({
  active,
  delayMs,
  className,
}: {
  active: boolean;
  delayMs: number;
  className: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`pointer-events-none absolute h-2 w-2 fill-[var(--color-accent)] transition-opacity duration-500 motion-reduce:transition-none ${
        active ? "opacity-100" : "opacity-0"
      } ${className}`}
      style={{ transitionDelay: active ? `${delayMs}ms` : "0ms" }}
    >
      <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
    </svg>
  );
}

/**
 * The Pulse logo mark itself is the global refresh control — single-user
 * app, per Ken's explicit request not to add a separate icon button. Pending
 * state is a subtle opacity dip rather than a spinner, keeping this a plain
 * mark visually until it's actually doing something.
 *
 * The gold glow + sparkle on hover/focus/tap is a deliberate one-off
 * exception to the "no blur/colored shadow" rule in docs/DESIGN_SYSTEM.md
 * — see docs/DECISIONS.md — scoped to this single control because it's
 * the one element that's both the brand mark and a global action, so it
 * needs its own "this is clickable" cue. `active` (hover or keyboard
 * focus) drives it on desktop, sustained for as long as the cursor stays;
 * `tapPulse` gives touch devices — which never get a real hover state —
 * an equivalent moment, firing on tap and clearing itself shortly after.
 *
 * The <h1> lives inside the <form> (wrapping only the button) rather than
 * around it: <h1> takes phrasing content, and <form>/<p> are flow content,
 * so the other nesting is invalid HTML.
 */
export function RefreshAllTitle() {
  const [state, formAction, isPending] = useActionState(refreshAllWidgetsAction, initialState);
  const [active, setActive] = useState(false);
  const [tapPulse, setTapPulse] = useState(false);
  const sparkling = active || tapPulse;

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
          className={`relative inline-flex transition-[opacity,filter] duration-300 ease-out motion-reduce:transition-none ${
            isPending
              ? "opacity-60"
              : `opacity-100 ${
                  sparkling
                    ? "drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]"
                    : ""
                }`
          }`}
        >
          {/* Local static asset at a small fixed size — next/image's
              overhead isn't warranted, same call as profile-menu.tsx's avatar. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-pulse.png" alt="" aria-hidden="true" className="h-9 w-auto dark:invert" />
          <Sparkle active={sparkling} delayMs={0} className="-top-1 -right-1" />
          <Sparkle active={sparkling} delayMs={120} className="-bottom-1 -left-1" />
          <Sparkle active={sparkling} delayMs={240} className="top-0 left-1/2 h-1.5 w-1.5" />
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
