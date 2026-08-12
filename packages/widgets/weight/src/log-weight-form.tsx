"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS } from "@pulse/ui";

const initialState: WidgetActionState = {};

/** A single weight input, resets on success — same reset-on-success
 *  pattern as AddTaskForm/AddBookForm. */
export function LogWeightForm({ action }: { action: WidgetAction }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state?.error]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <input
        name="weightKg"
        type="number"
        step="0.1"
        min={0}
        placeholder="Weight (kg)"
        required
        disabled={isPending}
        className={`flex-1 ${FIELD_CLASS}`}
      />
      <Button type="submit" disabled={isPending}>
        Log
      </Button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
