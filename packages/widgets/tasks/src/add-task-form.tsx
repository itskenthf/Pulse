"use client";

import type { WidgetAction } from "@pulse/sdk";
import { Button, FIELD_CLASS, useResettableForm } from "@pulse/ui";

export function AddTaskForm({ action }: { action: WidgetAction }) {
  const { state, formAction, isPending, formRef } = useResettableForm(action);

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
