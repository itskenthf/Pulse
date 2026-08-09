import { Scale } from "lucide-react";
import Link from "next/link";
import { progressPercent } from "@pulse/health";
import { EmptyState, Metric, ProgressRing, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { WeightWidgetActions } from "./actions";
import { LogWeightForm } from "./log-weight-form";
import type { WeightData } from "./types";

export function WeightComponent({
  data,
  actions,
}: WidgetRenderProps<WeightData, Record<string, unknown>, WeightWidgetActions>) {
  const logs = data?.logs ?? [];
  const latest = logs[0] ?? null;
  const goal = data?.goal ?? null;
  const oldest = logs.length > 0 ? logs[logs.length - 1] : null;

  const percent =
    latest && goal
      ? progressPercent(
          latest.weightKg,
          goal.targetValue,
          goal.comparator,
          goal.comparator === "at_most" ? oldest?.weightKg : undefined,
        )
      : null;

  return (
    <WidgetCard
      title="Weight"
      icon={<Scale className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="weight" actions={actions} />}
      compact
      footer={
        <Link href="/health/weight" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
          View trend →
        </Link>
      }
    >
      {!latest ? (
        <EmptyState
          message="No weigh-ins logged yet"
          action={<LogWeightForm action={actions.logWeight} />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <Metric label="Current" value={latest.weightKg.toFixed(1)} suffix="kg" />
            {percent !== null && (
              <ProgressRing percent={percent} size={56} strokeWidth={3}>
                <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
                  {percent}%
                </span>
              </ProgressRing>
            )}
          </div>
          <LogWeightForm action={actions.logWeight} />
        </div>
      )}
    </WidgetCard>
  );
}
