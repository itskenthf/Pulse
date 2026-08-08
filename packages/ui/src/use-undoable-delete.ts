"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const DEFAULT_UNDO_WINDOW_MS = 5000;

export interface UseUndoableDeleteResult {
  /** True from the moment `requestDelete()` is called until either `undo()`
   *  cancels it or the window elapses and the real delete actually commits. */
  pending: boolean;
  /** Wire to the delete button's `onClick` instead of submitting a delete
   *  form directly — starts the undo window rather than deleting immediately. */
  requestDelete: () => void;
  /** Wire to the "Undo" affordance shown while `pending` — cancels the
   *  timer; nothing is ever submitted to the real delete action. */
  undo: () => void;
  /** Attach to the real `<form action={deleteAction}>` — `requestSubmit()`
   *  is called on it once the undo window elapses without `undo()`. */
  formRef: RefObject<HTMLFormElement | null>;
}

/**
 * A few-second grace window before a destructive delete actually commits —
 * a mis-tap on "Delete" (the checkbox/delete buttons on Tasks/Notes sit
 * right next to each other at the same touch-target size) previously lost
 * data instantly with no recovery path (see FEATURE_GAP_REPORT.md #3 /
 * UX_AUDIT.md's M2). Deliberately client-only, no server-side "soft
 * delete" state: nothing is submitted to the real delete action until the
 * window elapses without `undo()` being called, so an undone delete simply
 * never happened as far as the server is concerned.
 */
export function useUndoableDelete(windowMs: number = DEFAULT_UNDO_WINDOW_MS): UseUndoableDeleteResult {
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function requestDelete() {
    setPending(true);
    timerRef.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, windowMs);
  }

  function undo() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(false);
  }

  return { pending, requestDelete, undo, formRef };
}
