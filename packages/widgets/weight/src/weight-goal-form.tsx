"use client";

import { useActionState, useEffect, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import { Button, FIELD_CLASS } from "@pulse/ui";

const initialState: WidgetActionState = {};

/** Only shown on /health/weight when no active weight goal exists yet —
 *  metric is fixed to weight_kg, only target/direction are user input. */
export function WeightGoalForm({ action }: { action: WidgetAction }) {
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
      <input
        name="title"
        placeholder="Goal, e.g. Reach 45kg"
        required
        disabled={isPending}
        className={`flex-1 ${FIELD_CLASS}`}
      />
      <input
        name="targetValue"
        type="number"
        step="0.1"
        min={0}
        placeholder="Target (kg)"
        required
        disabled={isPending}
        className={`w-full sm:w-32 ${FIELD_CLASS}`}
      />
      <select name="comparator" disabled={isPending} defaultValue="at_most" className={FIELD_CLASS}>
        <option value="at_most">Lose to</option>
        <option value="at_least">Gain to</option>
      </select>
      <Button type="submit" disabled={isPending} className="shrink-0">
        Set goal
      </Button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
