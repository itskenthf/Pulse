"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import type { NutritionField } from "@pulse/database";
import { progressPercent } from "@pulse/health";
import { ProgressBar } from "@pulse/ui";
import type { NutritionGoal, NutritionToday } from "./types";

const initialState: WidgetActionState = {};

interface RowConfig {
  field: NutritionField;
  label: string;
  amount: number;
  unit: string;
  value: (today: NutritionToday) => number;
}

const ROWS: RowConfig[] = [
  { field: "calories", label: "Calories", amount: 250, unit: "kcal", value: (t) => t.calories },
  { field: "protein_g", label: "Protein", amount: 20, unit: "g", value: (t) => t.proteinG },
  { field: "water_ml", label: "Water", amount: 250, unit: "ml", value: (t) => t.waterMl },
  { field: "milk_ml", label: "Milk", amount: 200, unit: "ml", value: (t) => t.milkMl },
];

function QuickLogRow({
  row,
  today,
  goal,
  action,
}: {
  row: RowConfig;
  today: NutritionToday;
  goal: NutritionGoal | undefined;
  action: WidgetAction;
}) {
  const [, formAction, isPending] = useActionState(action, initialState);
  const current = row.value(today);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--foreground)]">
          {row.label}{" "}
          <span className="tabular-nums text-[var(--color-neutral-500)]">
            {current}
            {goal ? ` / ${goal.targetValue}` : ""}
            {row.unit}
          </span>
        </span>
        <input type="hidden" name="field" value={row.field} />
        <input type="hidden" name="amount" value={row.amount} />
        <button
          type="submit"
          disabled={isPending}
          aria-label={`Add ${row.amount}${row.unit} ${row.label.toLowerCase()}`}
          className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[4px] border border-[var(--color-accent)] px-2 text-xs font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> {row.amount}
          {row.unit}
        </button>
      </div>
      {goal && (
        <ProgressBar
          percent={progressPercent(current, goal.targetValue, goal.comparator)}
          label={`${row.label}, ${current} of ${goal.targetValue}${row.unit}`}
        />
      )}
    </form>
  );
}

export function QuickLogButtons({
  today,
  goals,
  action,
}: {
  today: NutritionToday;
  goals: NutritionGoal[];
  action: WidgetAction;
}) {
  return (
    <div className="flex flex-col gap-3">
      {ROWS.map((row) => (
        <QuickLogRow
          key={row.field}
          row={row}
          today={today}
          goal={goals.find((goal) => goal.metric === row.field)}
          action={action}
        />
      ))}
    </div>
  );
}
