import { Lightbulb } from "lucide-react";
import { EmptyState, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetActions, WidgetRenderProps } from "@pulse/sdk";
import type { InsightsData } from "./types";

export function InsightsComponent({
  data,
  actions,
}: WidgetRenderProps<InsightsData, Record<string, unknown>, WidgetActions>) {
  const insights = data?.insights ?? [];

  return (
    <WidgetCard
      title="Insights"
      icon={<Lightbulb className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="insights" actions={actions} />}
      compact
    >
      {insights.length === 0 ? (
        <EmptyState message="Nothing to observe yet — keep logging and check back." />
      ) : (
        <ul className="flex flex-col gap-2">
          {insights.map((insight) => (
            <li key={insight} className="text-sm text-[var(--foreground)]">
              {insight}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
