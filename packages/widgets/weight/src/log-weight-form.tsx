"use client";

import type { WidgetAction } from "@pulse/sdk";
import { Button, FIELD_CLASS, useResettableForm } from "@pulse/ui";

/** A single weight input, resets on success via useResettableForm — same
 *  reset-on-success pattern as AddTaskForm/AddBookForm. */
export function LogWeightForm({ action }: { action: WidgetAction }) {
  const { state, formAction, isPending, formRef } = useResettableForm(action);

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
