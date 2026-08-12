import type { ReactNode } from "react";

export interface EmptyStateProps {
  message: string;
  /** e.g. a "Connect account" button — an empty state caused by
   *  missing setup, not missing data, gets a way to fix it right there. */
  action?: ReactNode;
}

/**
 * A widget's "nothing to show yet" state — every widget previously wrote
 * its own bare `<p>`, inheriting WidgetCard's text color/size but with no
 * consistent layout (left-aligned at the top of the card body, leaving
 * the rest of the card's height as dead space). This centers within
 * whatever space the widget body has, matching `ErrorState`'s layout
 * language for the other "non-content" state a widget can be in.
 */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-3 text-center text-sm text-[var(--color-neutral-500)]">
      <p>{message}</p>
      {action}
    </div>
  );
}
