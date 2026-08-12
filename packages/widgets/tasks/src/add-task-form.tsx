"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS } from "@pulse/ui";

const initialState: WidgetActionState = {};

export function AddTaskForm({ action }: { action: WidgetAction }) {
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
        name="title"
        placeholder="Add a task"
        required
        disabled={isPending}
        className={`flex-1 ${FIELD_CLASS}`}
      />
      <Button type="submit" disabled={isPending}>
        Add
      </Button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
