import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listMealHistory, readWidgetCache } from "@pulse/database";
import { MEALS_WIDGET_ID, MealToggleRow, MealsSummary, mealsDataSchema } from "@pulse/widget-meals";
import { auth } from "@/auth";
import { toggleMealAction } from "@/app/actions/meals";

const HISTORY_DAYS = 14;
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function MealsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [cached, history] = await Promise.all([
    readWidgetCache(session.user.id, MEALS_WIDGET_ID, mealsDataSchema),
    listMealHistory(session.user.id, HISTORY_DAYS),
  ]);
  const today = cached?.data.today ?? {
    loggedOn: "",
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
  };

  return (
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Meals
        </h1>

        <MealsSummary today={today} />

        <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
          {MEALS.map((meal) => (
            <MealToggleRow key={meal} meal={meal} checked={today[meal]} action={toggleMealAction} />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
            History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-divider)] text-xs text-[var(--color-neutral-500)]">
                  <th className="py-2 pr-2 font-normal">Date</th>
                  {MEALS.map((meal) => (
                    <th key={meal} className="py-2 pr-2 font-normal capitalize">
                      {meal}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-divider)]">
                {history.map((day) => (
                  <tr key={day.loggedOn}>
                    <td className="py-2 pr-2 text-[var(--foreground)]">{formatDate(day.loggedOn)}</td>
                    {MEALS.map((meal) => (
                      <td key={meal} className="py-2 pr-2 text-[var(--color-neutral-600)]">
                        {day[meal] ? "✓" : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
