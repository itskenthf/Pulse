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
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Something went wrong.
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Try reloading the page.</p>
      <button
        type="button"
        onClick={reset}
        className={`rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 ${SPRING_PRESS}`}
      >
        Try again
      </button>
    </div>
  );
}
