import { Utensils } from "lucide-react";
import Link from "next/link";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { MealsWidgetActions } from "./actions";
import { MealToggleRow } from "./meal-toggle-row";
import type { MealsData } from "./types";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export function MealsComponent({
  data,
  actions,
}: WidgetRenderProps<MealsData, Record<string, unknown>, MealsWidgetActions>) {
  const today = data?.today ?? {
    loggedOn: "",
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  };

  return (
    <WidgetCard
      title="Meals"
      icon={<Utensils className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="meals" actions={actions} />}
      compact
      footer={
        <Link href="/health/meals" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
          View history →
        </Link>
      }
    >
      <div className="flex flex-col">
        {MEALS.map((meal) => (
          <MealToggleRow key={meal} meal={meal} checked={today[meal]} action={actions.toggleMeal} />
        ))}
      </div>
    </WidgetCard>
  );
}
