"use client";

import { useActionState, useRef } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import type { Meal } from "@pulse/database";

const initialState: WidgetActionState = {};

const LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Toggling a meal off isn't destructive in the same undo-window sense as
 *  deleting a task or book — same reasoning that keeps Reading's "start a
 *  new book" out of `useUndoableDelete` — so this is a plain auto-submit
 *  checkbox, matching TaskRow's checkbox pattern exactly. */
export function MealToggleRow({
  meal,
  checked,
  action,
}: {
  meal: Meal;
  checked: boolean;
  action: WidgetAction;
}) {
  const [, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex min-h-11 items-center gap-2">
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="checked" value={(!checked).toString()} />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          id={`meal-${meal}`}
          checked={checked}
          disabled={isPending}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
      </span>
      <label
        htmlFor={`meal-${meal}`}
        className={`flex-1 text-sm ${checked ? "text-[var(--color-neutral-400)] line-through" : "text-[var(--foreground)]"}`}
      >
        {LABELS[meal]}
      </label>
    </form>
  );
}
