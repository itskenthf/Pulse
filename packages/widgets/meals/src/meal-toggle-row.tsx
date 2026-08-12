"use client";

import { useOptimistic, useTransition } from "react";
import type { WidgetAction } from "@pulse/sdk";
import type { Meal } from "@pulse/database";

const LABELS: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Toggling a meal off isn't destructive in the same undo-window sense as
 *  deleting a task or book — same reasoning that keeps Reading's "start a
 *  new book" out of `useUndoableDelete` — so this is a plain auto-submit
 *  checkbox, matching TaskRow's checkbox pattern exactly, including the
 *  optimistic flip: calling `action` directly inside the same
 *  startTransition as the optimistic update (rather than through
 *  `<form action>`/useActionState) is what lets useOptimistic revert on a
 *  failed write instead of leaving a stale checkmark on screen. */
export function MealToggleRow({
  meal,
  checked,
  action,
}: {
  meal: Meal;
  checked: boolean;
  action: WidgetAction;
}) {
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(checked);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !optimisticChecked;
    startTransition(async () => {
      setOptimisticChecked(next);
      const formData = new FormData();
      formData.set("meal", meal);
      formData.set("checked", String(next));
      try {
        await action({}, formData);
      } catch (err) {
        console.error(`Failed to toggle ${meal}:`, err);
      }
    });
  }

  return (
    <div className="flex min-h-11 items-center gap-2">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          id={`meal-${meal}`}
          checked={optimisticChecked}
          disabled={isPending}
          onChange={handleToggle}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
      </span>
      <label
        htmlFor={`meal-${meal}`}
        className={`flex-1 text-sm ${optimisticChecked ? "text-[var(--color-neutral-400)] line-through" : "text-[var(--foreground)]"}`}
      >
        {LABELS[meal]}
      </label>
    </div>
  );
}
