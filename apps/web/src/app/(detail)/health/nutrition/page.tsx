import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listNutritionHistory, readWidgetCache } from "@pulse/database";
import {
  NUTRITION_WIDGET_ID,
  NutritionCorrectionForm,
  NutritionGoalForm,
  nutritionDataSchema,
} from "@pulse/widget-nutrition";
import { auth } from "@/auth";
import { createNutritionGoalAction, setAmountAction } from "@/app/actions/nutrition";

export const metadata: Metadata = { title: "Nutrition" };

const METRIC_LABELS: Record<string, string> = {
  calories: "Calories",
  protein_g: "Protein",
  water_ml: "Water",
  milk_ml: "Milk",
};
const COMPARATOR_LABELS: Record<string, string> = {
  at_least: "at least",
  at_most: "at most",
  exactly: "exactly",
};

const HISTORY_DAYS = 14;

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function NutritionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [cached, history] = await Promise.all([
    readWidgetCache(session.user.id, NUTRITION_WIDGET_ID, nutritionDataSchema),
    listNutritionHistory(session.user.id, HISTORY_DAYS),
  ]);
  const today = cached?.data.today ?? {
    loggedOn: "",
    calories: 0,
    proteinG: 0,
    waterMl: 0,
    milkMl: 0,
  };
  const goals = cached?.data.goals ?? [];

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Nutrition
      </h1>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
          Today
        </h2>
        <NutritionCorrectionForm today={today} action={setAmountAction} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
          Daily targets
        </h2>
        {goals.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-[var(--color-neutral-600)]">
            {goals.map((goal) => (
              <li key={goal.id}>
                {METRIC_LABELS[goal.metric]}: {COMPARATOR_LABELS[goal.comparator]} {goal.targetValue}
              </li>
            ))}
          </ul>
        )}
        <NutritionGoalForm action={createNutritionGoalAction} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
          History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-divider)] text-xs text-[var(--color-neutral-500)]">
                <th className="py-2 pr-2 font-normal">Date</th>
                <th className="py-2 pr-2 font-normal">Calories</th>
                <th className="py-2 pr-2 font-normal">Protein</th>
                <th className="py-2 pr-2 font-normal">Water</th>
                <th className="py-2 font-normal">Milk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {history.map((day) => (
                <tr key={day.loggedOn}>
                  <td className="py-2 pr-2 text-[var(--foreground)]">{formatDate(day.loggedOn)}</td>
                  <td className="py-2 pr-2 tabular-nums text-[var(--color-neutral-600)]">
                    {day.calories}
                  </td>
                  <td className="py-2 pr-2 tabular-nums text-[var(--color-neutral-600)]">
                    {day.proteinG}g
                  </td>
                  <td className="py-2 pr-2 tabular-nums text-[var(--color-neutral-600)]">
                    {day.waterMl}ml
                  </td>
                  <td className="py-2 tabular-nums text-[var(--color-neutral-600)]">{day.milkMl}ml</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
