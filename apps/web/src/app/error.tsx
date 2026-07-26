"use client";

import { useEffect } from "react";
import { SPRING_PRESS } from "@pulse/ui";

/**
 * Last-resort safety net for anything that escapes the widget grid's own
 * per-widget error handling (see WidgetSlot in page.tsx) — e.g. an error
 * in the layout, navbar, or auth lookup itself. Next.js's App Router
 * convention: must be a Client Component, receives the thrown error and
 * a reset() to retry rendering the segment without a full page reload.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] p-6 text-center">
      <p className="font-heading text-lg font-semibold text-[var(--foreground)]">
        Something went wrong.
      </p>
      <p className="text-sm text-[var(--color-neutral-600)]">Try reloading the page.</p>
      <button
        type="button"
        onClick={reset}
        className={`rounded-[4px] border border-[var(--color-accent)] px-4 py-2 font-heading text-sm font-semibold text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] ${SPRING_PRESS}`}
      >
        Try again
      </button>
    </div>
  );
}
