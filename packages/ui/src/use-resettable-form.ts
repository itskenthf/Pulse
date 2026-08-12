"use client";

import { useActionState, useEffect, useRef, type RefObject } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";

const INITIAL_STATE: WidgetActionState = {};

export interface UseResettableFormResult {
  state: WidgetActionState;
  formAction: (formData: FormData) => void;
  isPending: boolean;
  /** Attach to the `<form>` — reset on success clears it via this ref. */
  formRef: RefObject<HTMLFormElement | null>;
}

/**
 * `useActionState` plus "clear the form once the action succeeds" — the
 * shape every quick-add form (Tasks, Reading, Weight's log/goal forms,
 * Nutrition's goal form) previously hand-wrote identically five times.
 * Resets on the pending→settled transition only when there's no error,
 * so a failed submission leaves the user's input in place to fix.
 */
export function useResettableForm(action: WidgetAction): UseResettableFormResult {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state?.error]);

  return { state, formAction, isPending, formRef };
}
