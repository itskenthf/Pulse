"use client";

import { useEffect } from "react";

export interface UseKeyboardShortcutOptions {
  /** Set to `false` to temporarily stop listening without unmounting the
   *  caller — e.g. while the action the shortcut triggers is already pending. */
  enabled?: boolean;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

/**
 * Fires `handler` on a bare, unmodified keypress of `key` (case-
 * insensitive) — e.g. `r` for the dashboard's global refresh, mirroring
 * the existing logo-tap gesture (see RefreshAllTitle). Deliberately does
 * nothing while a modifier key (Cmd/Ctrl/Alt) is held, so it never
 * shadows a real browser/OS shortcut, and does nothing while focus is
 * inside a text input/textarea/select/contenteditable, so typing the
 * letter itself into a note or task title never accidentally triggers it.
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  { enabled = true }: UseKeyboardShortcutOptions = {},
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      handler();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, handler, enabled]);
}
