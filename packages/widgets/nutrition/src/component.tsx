import { Apple } from "lucide-react";
import Link from "next/link";
import { TrendLine, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { NutritionWidgetActions } from "./actions";
import { QuickLogButtons } from "./quick-log-buttons";
import type { NutritionData } from "./types";

const DEFAULT_TODAY = { loggedOn: "", calories: 0, proteinG: 0, waterMl: 0, milkMl: 0 };

export function NutritionComponent({
  data,
  actions,
}: WidgetRenderProps<NutritionData, Record<string, unknown>, NutritionWidgetActions>) {
  const today = data?.today ?? DEFAULT_TODAY;
  const goals = data?.goals ?? [];
  const history = data?.history ?? [];

  return (
    <WidgetCard
      title="Nutrition"
      icon={<Apple className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="nutrition" actions={actions} />}
      compact
      footer={
        <Link
          href="/health/nutrition"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View history →
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        {history.length > 1 && (
          <div className="flex justify-center">
            <TrendLine points={history.map((day) => day.calories)} width={200} height={32} />
          </div>
        )}
        <QuickLogButtons today={today} goals={goals} action={actions.logAmount} />
      </div>
    </WidgetCard>
  );
}
