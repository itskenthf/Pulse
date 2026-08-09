import { Apple } from "lucide-react";
import Link from "next/link";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
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
      <QuickLogButtons today={today} action={actions.logAmount} />
    </WidgetCard>
  );
}
