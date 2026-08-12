"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Shared pointerdown-outside-root + Escape-key dismissal listener —
 * previously hand-rolled identically in `useDismissableMenu` (WidgetMenu/
 * ProfileMenu's dropdowns) and GitHub's `useDayPopover` (the heatmap's day
 * popovers). `onOutsidePointerDown` and `onEscape` are separate callbacks,
 * not one shared `onDismiss`, since a caller may want different behavior
 * for each — `useDismissableMenu` returns focus to its trigger on Escape
 * but deliberately not on an outside click, since the user already moved
 * their attention elsewhere on purpose there; `onEscape` defaults to
 * `onOutsidePointerDown` for callers (like `useDayPopover`) where both
 * should behave identically.
 *
 * Callbacks are stashed in refs (same pattern as `useKeyboardShortcut`'s
 * `handlerRef`) so the listener effect only depends on `active`, not a
 * caller's possibly-new-every-render inline function identity — otherwise
 * every unrelated re-render would tear down and re-add the document
 * listeners.
 */
export function useOutsideDismiss<T extends HTMLElement>(
  active: boolean,
  rootRef: RefObject<T | null>,
  onOutsidePointerDown: () => void,
  onEscape: () => void = onOutsidePointerDown,
): void {
  const onOutsidePointerDownRef = useRef(onOutsidePointerDown);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onOutsidePointerDownRef.current = onOutsidePointerDown;
    onEscapeRef.current = onEscape;
  }, [onOutsidePointerDown, onEscape]);

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        onOutsidePointerDownRef.current();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscapeRef.current();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // rootRef's identity is stable across renders (a React ref object),
    // so including it here doesn't cause extra re-subscribes.
  }, [active, rootRef]);
}
