"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { WidgetActionState } from "@pulse/sdk";
import { useKeyboardShortcut, usePullToRefresh } from "@pulse/ui";
import { refreshAllWidgetsAction } from "./actions/widgets";

const initialState: WidgetActionState = {};

/**
 * Minimum time between visibility-triggered refreshes. Comfortably below
 * the 30-minute cron interval (docs/DECISIONS.md) so returning to the app
 * after a real gap catches up quickly, but well above a quick tab/app
 * switch-and-back — every adapter here (GitHub, Spotify, Steam, weather)
 * has its own rate limit, and the cron job already keeps data fresh in
 * the background regardless of client activity.
 */
const AUTO_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

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
  const formRef = useRef<HTMLFormElement>(null);
  const lastRefreshRef = useRef(0);
  const isPendingRef = useRef(isPending);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    lastRefreshRef.current = Date.now();
  }, []);

  useEffect(() => {
    function maybeAutoRefresh() {
      if (document.visibilityState !== "visible") return;
      if (isPendingRef.current) return;
      if (Date.now() - lastRefreshRef.current < AUTO_REFRESH_THRESHOLD_MS) return;

      lastRefreshRef.current = Date.now();
      formRef.current?.requestSubmit();
    }

    document.addEventListener("visibilitychange", maybeAutoRefresh);
    window.addEventListener("focus", maybeAutoRefresh);
    return () => {
      document.removeEventListener("visibilitychange", maybeAutoRefresh);
      window.removeEventListener("focus", maybeAutoRefresh);
    };
  }, []);

  // Mobile pull-to-refresh — same trigger as a manual logo tap
  // (formRef.current?.requestSubmit()), just gesture-driven instead of
  // click-driven. See packages/ui/src/use-pull-to-refresh.ts.
  const { pullDistance, armed } = usePullToRefresh({
    onRefresh: () => {
      lastRefreshRef.current = Date.now();
      formRef.current?.requestSubmit();
    },
    pending: isPending,
  });

  // Keyboard shortcut for the same trigger — "r", the single
  // highest-frequency dashboard action (see FEATURE_GAP_REPORT.md #6 /
  // UX_AUDIT.md K1). Disabled while a refresh is already pending so a
  // held/repeated keypress can't queue up redundant submissions.
  useKeyboardShortcut(
    "r",
    () => {
      lastRefreshRef.current = Date.now();
      formRef.current?.requestSubmit();
    },
    { enabled: !isPending },
  );

  return (
    <form ref={formRef} action={formAction}>
      {(pullDistance > 0 || isPending) && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center pt-2 transition-opacity ${
            armed || isPending ? "text-[var(--color-accent)]" : "text-[var(--color-neutral-500)]"
          }`}
          style={{ opacity: isPending ? 1 : Math.min(pullDistance / 70, 1) }}
        >
          <RefreshCw
            className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            style={isPending ? undefined : { transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}
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
            lastRefreshRef.current = Date.now();
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
            className={`inline-block aspect-[900/661] h-6 sm:h-7 transition-colors duration-300 ease-out motion-reduce:transition-none ${
              lit ? "bg-[var(--color-accent)]" : "bg-[var(--foreground)]"
            }`}
          />
        </button>
      </h1>
      {state?.error && (
        <p className="mt-1 max-w-64 text-xs whitespace-pre-line text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
