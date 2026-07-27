import { GitCommit } from "lucide-react";
import { EmptyState, GLASS_CHIP, Metric, RADIUS, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { formatRelativeDay } from "./format";
import { Heatmap } from "./heatmap";
import { GitHubIcon } from "./icon";
import { computeStreaks } from "./streaks";
import type { GitHubData } from "./types";

function ActivitySummaryBlock({ summary }: { summary: GitHubData["activitySummary"] }) {
  if (!summary) return null;

  const rows: string[] = [];
  if (summary.commitCount > 0) {
    rows.push(
      `${summary.commitCount} commit${summary.commitCount === 1 ? "" : "s"} across ${
        summary.repositoriesWithCommits
      } repositor${summary.repositoriesWithCommits === 1 ? "y" : "ies"}`,
    );
  }
  if (summary.pullRequestsOpened > 0) {
    rows.push(
      `${summary.pullRequestsOpened} pull request${summary.pullRequestsOpened === 1 ? "" : "s"} opened`,
    );
  }
  if (summary.repositoriesCreated > 0) {
    rows.push(
      `${summary.repositoriesCreated} repositor${summary.repositoriesCreated === 1 ? "y" : "ies"} created`,
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 lg:max-w-56">
      <span className="text-xs tracking-[0.08em] text-[var(--color-neutral-400)] uppercase">
        This month
      </span>
      {rows.map((row) => (
        <span key={row} className="text-sm text-[var(--color-neutral-600)]">
          {row}
        </span>
      ))}
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
      tag={{ label: "Connected", variant: "outline" }}
      action={<WidgetMenu id="github" actions={actions} />}
    >
      {data ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <Metric label="Today" value={data.totalToday} />
            <Metric label="This week" value={data.totalThisWeek} />
            {streaks && <Metric label="Streak" value={streaks.current} suffix="d" />}
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <Heatmap weeks={data.weeks} />
            <ActivitySummaryBlock summary={data.activitySummary} />
          </div>
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
