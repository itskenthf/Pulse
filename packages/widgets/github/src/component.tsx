import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { Heatmap } from "./heatmap";
import { GitHubIcon } from "./icon";
import type { GitHubData } from "./types";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{value}</span>
      <span className="text-xs text-zinc-500 dark:text-zinc-500">{label}</span>
    </div>
  );
}

export function GitHubComponent({
  data,
  actions,
}: WidgetRenderProps<GitHubData, Record<string, unknown>>) {
  return (
    <WidgetCard
      title="GitHub"
      icon={<GitHubIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" />}
    >
      {data ? (
        <div className="flex flex-col gap-3">
          <div className="flex gap-6">
            <Stat label="Today" value={data.totalToday} />
            <Stat label="This week" value={data.totalThisWeek} />
            <Stat label="This year" value={data.totalThisYear} />
          </div>
          <Heatmap weeks={data.weeks} />
        </div>
      ) : (
        <p>No data yet — click refresh to load your contributions.</p>
      )}
    </WidgetCard>
  );
}
