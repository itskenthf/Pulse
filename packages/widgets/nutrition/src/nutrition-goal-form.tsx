"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS } from "@pulse/ui";

const initialState: WidgetActionState = {};

const METRIC_OPTIONS: { value: string; label: string }[] = [
  { value: "calories", label: "Calories" },
  { value: "protein_g", label: "Protein (g)" },
  { value: "water_ml", label: "Water (ml)" },
  { value: "milk_ml", label: "Milk (ml)" },
];

/** Sets (or replaces) a daily target for one nutrition metric — the app
 *  action deactivates any existing active goal for that metric first, so
 *  submitting again just updates the target instead of accumulating
 *  duplicate active goals. */
export function NutritionGoalForm({ action }: { action: WidgetAction }) {
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
    <form ref={formRef} action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <select name="metric" disabled={isPending} defaultValue="calories" className={FIELD_CLASS}>
        {METRIC_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        name="targetValue"
        type="number"
        min={0}
        placeholder="Daily target"
        required
        disabled={isPending}
        className={`w-full sm:w-32 ${FIELD_CLASS}`}
      />
      <select name="comparator" disabled={isPending} defaultValue="at_least" className={FIELD_CLASS}>
        <option value="at_least">At least</option>
        <option value="at_most">At most</option>
      </select>
      <Button type="submit" disabled={isPending} className="shrink-0">
        Set target
      </Button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
