"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { WidgetActionState } from "@pulse/sdk";
import type { NotebookWidgetActions } from "./actions";
import { AUTOSAVE_DEBOUNCE_MS, MAX_CONTENT_LENGTH } from "./constants";

const initialState: WidgetActionState = {};

/**
 * The single "living draft" box: pausing autosaves it. While the box has
 * content, subsequent pauses update the same entry (upsert) rather than
 * creating a new one each time — that's what keeps a paragraph typed
 * with natural pauses from fragmenting into several entries. Clearing
 * the box closes the draft; the next non-empty pause starts a new entry.
 */
export function NotebookInput({
  actions,
  onPendingChange,
}: {
  actions: NotebookWidgetActions;
  /** Optional: a Server Component (e.g. the `/notebook` full page) can't
   *  pass a plain closure across the server/client boundary at all, so
   *  this must be safe to omit entirely rather than requiring a no-op —
   *  see docs/DECISIONS.md's Notebook follow-up entry. */
  onPendingChange?: (pending: boolean) => void;
}) {
  const [content, setContent] = useState("");
  const draftIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Synchronous (unlike the `pending` booleans below, which only update
  // after a render commits) — guards against a second debounce firing
  // while the first save is still in flight, which otherwise races
  // `draftIdRef` and creates a duplicate entry instead of updating the
  // one already being saved.
  const savingRef = useRef(false);

  const [addState, addFormAction, addPending] = useActionState(actions.addEntry, initialState);
  const [updateState, updateFormAction, updatePending] = useActionState(
    actions.updateEntry,
    initialState,
  );

  const pending = addPending || updatePending;
  const error = addState.error ?? updateState.error;

  useEffect(() => {
    onPendingChange?.(pending);
    if (!pending) savingRef.current = false;
  }, [pending, onPendingChange]);

  useEffect(() => {
    if (addState.entryId) {
      draftIdRef.current = addState.entryId;
    }
  }, [addState.entryId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function attemptSave(value: string) {
    if (savingRef.current) {
      // A previous save (create or update) hasn't resolved yet — retry
      // shortly instead of firing a second, concurrent one that would
      // race `draftIdRef` and create a duplicate entry.
      timerRef.current = setTimeout(() => attemptSave(value), AUTOSAVE_DEBOUNCE_MS / 3);
      return;
    }

    const formData = new FormData();
    formData.set("content", value);
    savingRef.current = true;

    // useActionState's dispatch must run inside a transition when called
    // outside a <form> submit, or `isPending` never flips true/false and
    // React warns at runtime — see the doc comment above.
    startTransition(() => {
      if (draftIdRef.current) {
        formData.set("entryId", draftIdRef.current);
        updateFormAction(formData);
      } else {
        addFormAction(formData);
      }
    });
  }

  function handleChange(value: string) {
    setContent(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (value.trim() === "") {
      draftIdRef.current = null;
      return;
    }

    timerRef.current = setTimeout(() => attemptSave(value), AUTOSAVE_DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-1">
      <textarea
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="What's on your mind?"
        rows={2}
        maxLength={MAX_CONTENT_LENGTH}
        className="resize-none border-none bg-transparent p-0 font-body text-sm text-[var(--foreground)] placeholder:font-body placeholder:italic placeholder:text-[var(--color-neutral-400)] focus-visible:outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
