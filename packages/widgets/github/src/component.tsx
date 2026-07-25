import { GitCommit } from "lucide-react";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { formatRelativeDay } from "./format";
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
          {data.latestActivity && (
            <a
              href={data.latestActivity.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-2xl bg-white/40 px-4 py-3 shadow-sm ring-1 ring-inset ring-white/50 transition hover:bg-white/60 dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10"
            >
              <GitCommit className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                  {data.latestActivity.repoName}
                </span>
                <span className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                  {data.latestActivity.commitMessage}
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">
                  {formatRelativeDay(data.latestActivity.committedAt)}
                </span>
              </div>
            </a>
          )}
        </div>
      ) : (
        <p>No data yet — click refresh to load your contributions.</p>
      )}
    </WidgetCard>
  );
}
