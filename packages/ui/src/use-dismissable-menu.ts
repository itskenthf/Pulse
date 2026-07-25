"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseDismissableMenuResult<T extends HTMLElement, TTrigger extends HTMLElement> {
  open: boolean;
  setOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  /** Closes the menu and returns focus to the trigger — use this for
   *  closes the *user* initiated from inside the menu (Escape, an action
   *  completing) so keyboard focus doesn't get dropped onto the page
   *  body. Don't use this for an outside click/tap dismissal — the user
   *  already moved their attention elsewhere on purpose, so stealing
   *  focus back to the trigger there would be the surprising thing. */
  close: () => void;
  /** Attach to the menu's outermost element — clicks/taps inside this
   *  element never close the menu, anything outside does. */
  rootRef: RefObject<T | null>;
  /** Attach to the trigger button — lets `close()` return focus to it. */
  triggerRef: RefObject<TTrigger | null>;
}

/**
 * Open/close state for a dropdown, closed by a `pointerdown` listener
 * outside its root element — not CSS `:focus-within`, which relies on a
 * tap reliably moving DOM focus onto a `<button>`. Mobile/iPad Safari
 * doesn't always do that on tap, so `:focus-within` silently made a menu
 * unopenable on touch devices (see docs/DECISIONS.md). `pointerdown` (not
 * `click`) covers touch and mouse identically.
 *
 * Also closes on Escape (returning focus to the trigger, via `close()`)
 * — previously missing entirely, so a keyboard user had no way to
 * dismiss an open menu without tabbing all the way through it.
 *
 * Was hand-rolled identically in both WidgetMenu and ProfileMenu; this is
 * that logic in one place.
 */
export function useDismissableMenu<
  T extends HTMLElement = HTMLDivElement,
  TTrigger extends HTMLElement = HTMLButtonElement,
>(): UseDismissableMenuResult<T, TTrigger> {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<T>(null);
  const triggerRef = useRef<TTrigger>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return { open, setOpen, close, rootRef, triggerRef };
}
