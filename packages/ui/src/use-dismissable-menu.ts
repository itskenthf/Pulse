"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseDismissableMenuResult<T extends HTMLElement> {
  open: boolean;
  setOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  /** Attach to the menu's outermost element — clicks/taps inside this
   *  element never close the menu, anything outside does. */
  rootRef: RefObject<T | null>;
}

/**
 * Open/close state for a dropdown, closed by a `pointerdown` listener
 * outside its root element — not CSS `:focus-within`, which relies on a
 * tap reliably moving DOM focus onto a `<button>`. Mobile/iPad Safari
 * doesn't always do that on tap, so `:focus-within` silently made a menu
 * unopenable on touch devices (see docs/DECISIONS.md). `pointerdown` (not
 * `click`) covers touch and mouse identically.
 *
 * Was hand-rolled identically in both WidgetMenu and ProfileMenu; this is
 * that logic in one place.
 */
export function useDismissableMenu<T extends HTMLElement = HTMLDivElement>(): UseDismissableMenuResult<T> {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return { open, setOpen, rootRef };
}
