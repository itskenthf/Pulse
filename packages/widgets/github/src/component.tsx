import { ActionForm, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { Heatmap } from "./heatmap";
import { GitHubIcon } from "./icon";
import { computeStreaks } from "./streaks";
import type { GitHubData } from "./types";

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
        {suffix && <span className="text-lg font-semibold text-zinc-400 dark:text-zinc-600">{suffix}</span>}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-500">{label}</span>
    </div>
  );
}

export function GitHubComponent({
  data,
  actions,
}: WidgetRenderProps<GitHubData, Record<string, unknown>>) {
  const streaks = data ? computeStreaks(data.weeks) : null;

  return (
    <WidgetCard
      title="GitHub"
      icon={<GitHubIcon />}
      action={<WidgetMenu id="github" actions={actions} />}
      accent="blue"
    >
      {data ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <Stat label="Today" value={data.totalToday} />
            <Stat label="This week" value={data.totalThisWeek} />
            <Stat label="This year" value={data.totalThisYear} />
            {streaks && (
              <>
                <Stat label="Current streak" value={streaks.current} suffix="d" />
                <Stat label="Longest streak" value={streaks.longest} suffix="d" />
              </>
            )}
          </div>
          <Heatmap weeks={data.weeks} />
        </div>
      ) : (
        <p>No data yet — click refresh to load your contributions.</p>
      )}
    </WidgetCard>
  );
}
