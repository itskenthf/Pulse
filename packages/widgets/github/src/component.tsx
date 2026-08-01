import { EmptyState, Metric, RADIUS, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { RECENT_WEEKS_COUNT } from "./constants";
import { Heatmap } from "./heatmap";
import { GitHubIcon } from "./icon";
import { computeStreaks } from "./streaks";
import type { GitHubData } from "./types";

/** Same border-brightens-on-hover cue as `GLASS_CHIP`, minus its
 *  background-tint fill — Ken found the fill distracting specifically on
 *  this chip. Not promoted to a shared `packages/ui` token since it has
 *  exactly one caller; `GLASS_CHIP` itself is untouched so Quick Launch's
 *  tiles and other chips keep their fill. */
const HEATMAP_CHIP =
  "bg-transparent border border-[var(--color-divider)] transition-colors hover:border-[var(--color-accent)]";

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
          <div className={`flex flex-col gap-4 px-4 py-3 ${RADIUS.chip} ${HEATMAP_CHIP}`}>
            <Heatmap
              weeks={data.weeks.slice(-RECENT_WEEKS_COUNT)}
              totalThisYear={data.totalThisYear}
              year={new Date(data.fetchedAt).getUTCFullYear()}
            />
            <ActivitySummaryBlock summary={data.activitySummary} />
          </div>
        </div>
      ) : (
        <EmptyState message="No data yet — click refresh to load your contributions." />
      )}
    </WidgetCard>
  );
}
