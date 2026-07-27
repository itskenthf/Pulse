"use client";

import { useActionState } from "react";
import type { WidgetActionState } from "@pulse/sdk";
import { Sparkles } from "lucide-react";

const initialState: WidgetActionState = {};

export interface QuoteButtonProps {
  quote: string;
  cycleAction: (
    prevState: WidgetActionState,
    formData: FormData,
  ) => Promise<WidgetActionState>;
}

/**
 * Wraps the quote in a submit button styled as plain text — no button
 * chrome — so it reads as the same italic line it always has, just
 * clickable. Pending state dims it briefly, matching the logo's own
 * refresh-in-progress treatment (refresh-all-title.tsx).
 */
export function QuoteButton({ quote, cycleAction }: QuoteButtonProps) {
  const [state, formAction, isPending] = useActionState(cycleAction, initialState);

  return (
    <form action={formAction}>
      <div className="flex items-start gap-2 text-sm text-[var(--color-neutral-600)] italic">
        <Sparkles
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={isPending}
          aria-label="Next quote"
          title="Click for another quote"
          className={`min-h-11 cursor-pointer py-1 text-left underline decoration-transparent underline-offset-4 transition-[opacity,decoration-color] duration-200 ease-out hover:decoration-current disabled:cursor-default ${
            isPending ? "opacity-60" : "opacity-100"
          }`}
        >
          &ldquo;{quote}&rdquo;
        </button>
      </div>
      {state?.error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
