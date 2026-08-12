"use client";

import { useRef, useState } from "react";
import { useOutsideDismiss } from "@pulse/ui";

export interface UseDayPopoverResult {
  /** The date (YYYY-MM-DD) of the day whose popover is open, or null. */
  openDate: string | null;
  /** Toggles a day's popover open/closed — wire to a cell's onClick. */
  toggle: (date: string) => void;
  /** Closes whatever's open — wire to a cell's onMouseLeave. */
  close: () => void;
  /** Attach to the currently-open popover's own element so an outside
   *  pointerdown can tell it apart from a tap that should dismiss it. */
  popoverRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * One shared open/close state for the whole heatmap grid, keyed by which
 * day's popover is showing — not a `useDismissableMenu` instance per cell
 * (53×7 of those would be wasteful). Desktop hover is handled by the
 * caller's own onMouseEnter/onMouseLeave (no listener needed for that);
 * this hook only handles the touch/click-to-pin behavior: tapping a cell
 * opens its popover and keeps it open until a tap lands outside it, or
 * Escape is pressed — via `useOutsideDismiss`, the same shared listener
 * `useDismissableMenu` uses (no per-trigger focus-return needed here,
 * unlike a menu — there's no single trigger button to return focus to).
 */
export function useDayPopover(): UseDayPopoverResult {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const close = () => setOpenDate(null);

  useOutsideDismiss(openDate !== null, popoverRef, close);

  return {
    openDate,
    toggle: (date) => setOpenDate((current) => (current === date ? null : date)),
    close,
    popoverRef,
  };
}
