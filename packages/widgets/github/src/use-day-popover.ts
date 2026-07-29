"use client";

import { useEffect, useRef, useState } from "react";

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
 * Escape is pressed — the same `pointerdown`-not-`click` rationale as
 * `useDismissableMenu` (mobile Safari doesn't reliably fire
 * `:focus-within` on tap, so outside-dismiss needs its own listener
 * rather than relying on blur/focus).
 */
export function useDayPopover(): UseDayPopoverResult {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDate) return;

    function handlePointerDown(event: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenDate(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenDate(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDate]);

  return {
    openDate,
    toggle: (date) => setOpenDate((current) => (current === date ? null : date)),
    close: () => setOpenDate(null),
    popoverRef,
  };
}
