"use client";

import { useActionState } from "react";
import type { WidgetAction, WidgetActionState } from "@pulse/sdk";
import type { NutritionField } from "@pulse/database";
import type { NutritionToday } from "./types";

const initialState: WidgetActionState = {};

const FIELDS: { field: NutritionField; label: string; value: (t: NutritionToday) => number }[] = [
  { field: "calories", label: "Calories", value: (t) => t.calories },
  { field: "protein_g", label: "Protein (g)", value: (t) => t.proteinG },
  { field: "water_ml", label: "Water (ml)", value: (t) => t.waterMl },
  { field: "milk_ml", label: "Milk (ml)", value: (t) => t.milkMl },
];

/** Exact-amount correction, one field at a time — for fixing an over/under
 *  tap, distinct from the dashboard card's fixed-increment quick-log
 *  buttons. */
export function NutritionCorrectionForm({
  today,
  action,
}: {
  today: NutritionToday;
  action: WidgetAction;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {FIELDS.map((f) => (
        <CorrectionField key={f.field} field={f.field} label={f.label} value={f.value(today)} action={action} />
      ))}
    </div>
  );
}

function CorrectionField({
  field,
  label,
  value,
  action,
}: {
  field: NutritionField;
  label: string;
  value: number;
  action: WidgetAction;
}) {
  const [, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <label htmlFor={`nutrition-${field}`} className="text-xs text-[var(--color-neutral-500)]">
        {label}
      </label>
      <input type="hidden" name="field" value={field} />
      <div className="flex gap-1.5">
        <input
          id={`nutrition-${field}`}
          name="amount"
          type="number"
          min={0}
          key={value}
          defaultValue={value}
          disabled={isPending}
          className="min-h-11 w-full rounded-[4px] border border-[var(--color-divider)] bg-transparent px-2 py-1.5 text-sm text-[var(--foreground)] focus-visible:border-[var(--color-accent)] focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 shrink-0 rounded-[4px] border border-[var(--color-accent)] px-2 text-xs font-medium text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] disabled:opacity-50"
        >
          Set
        </button>
      </div>
    </form>
  );
}
