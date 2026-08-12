"use client";

import { useEffect, useRef } from "react";

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
  // A caller re-rendering for reasons unrelated to this hook (e.g.
  // RefreshAllTitle's hover/focus state) previously passed a new `handler`
  // identity every time, which tore down and re-added the document
  // listener on every one of those renders — see docs/DECISIONS.md's
  // 2026-08-12 entry. Stashing it in a ref (same pattern as
  // usePullToRefresh's onRefreshRef) lets the listener effect depend only
  // on `[key, enabled]`, which change rarely if ever.
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      handlerRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, enabled]);
}
