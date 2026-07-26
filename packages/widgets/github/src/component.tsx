import { GitCommit } from "lucide-react";
import { EmptyState, GLASS_CHIP, Metric, RADIUS, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { formatRelativeDay } from "./format";
import { Heatmap } from "./heatmap";
import { GitHubIcon } from "./icon";
import { computeStreaks } from "./streaks";
import type { GitHubData } from "./types";

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
    >
      {data ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <Metric label="Today" value={data.totalToday} />
            <Metric label="This week" value={data.totalThisWeek} />
            <Metric label="This year" value={data.totalThisYear} />
            {streaks && (
              <>
                <Metric label="Current streak" value={streaks.current} suffix="d" />
                <Metric label="Longest streak" value={streaks.longest} suffix="d" />
              </>
            )}
          </div>
          <Heatmap weeks={data.weeks} />
          {data.latestActivity && (
            <a
              href={data.latestActivity.commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start gap-3 ${RADIUS.chip} px-4 py-3 ${GLASS_CHIP}`}
            >
              <GitCommit
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-neutral-400)]"
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {data.latestActivity.repoName}
                </span>
                <span className="truncate text-sm text-[var(--color-neutral-600)]">
                  {data.latestActivity.commitMessage}
                </span>
                <span className="text-xs text-[var(--color-neutral-400)]">
                  {formatRelativeDay(data.latestActivity.committedAt)}
                </span>
              </div>
            </a>
          )}
        </div>
      ) : (
        <EmptyState message="No data yet — click refresh to load your contributions." />
      )}
    </WidgetCard>
  );
}
