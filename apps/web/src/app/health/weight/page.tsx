import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readWidgetCache } from "@pulse/database";
import { EmptyState, TrendLine } from "@pulse/ui";
import {
  LogWeightForm,
  WEIGHT_WIDGET_ID,
  WeightGoalForm,
  WeightLogRow,
  weightDataSchema,
} from "@pulse/widget-weight";
import { auth } from "@/auth";
import {
  createWeightGoalAction,
  deleteWeightLogAction,
  logWeightAction,
} from "@/app/actions/weight";

export default async function WeightPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const cached = await readWidgetCache(session.user.id, WEIGHT_WIDGET_ID, weightDataSchema);
  const logs = cached?.data.logs ?? [];
  const goal = cached?.data.goal ?? null;
  const chronological = [...logs].reverse();

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
          Weight
        </h1>

        <LogWeightForm action={logWeightAction} />

        {chronological.length > 0 && (
          <div className="flex justify-center border-y border-[var(--color-divider)] py-4">
            <TrendLine
              points={chronological.map((log) => log.weightKg)}
              goalValue={goal?.targetValue}
              width={480}
              height={120}
            />
          </div>
        )}

        {goal ? (
          <p className="text-sm text-[var(--color-neutral-600)]">
            Goal: <span className="font-medium text-[var(--foreground)]">{goal.title}</span>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
              Set a goal
            </h2>
            <WeightGoalForm action={createWeightGoalAction} />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
            History
          </h2>
          {logs.length === 0 ? (
            <EmptyState message="No weigh-ins yet — log one above." />
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
              {logs.map((log) => (
                <WeightLogRow key={log.id} log={log} deleteAction={deleteWeightLogAction} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
