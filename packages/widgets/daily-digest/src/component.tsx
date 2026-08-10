import { Activity } from "lucide-react";
import Link from "next/link";
import { EmptyState, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetActions, WidgetRenderProps } from "@pulse/sdk";
import type { DailyDigestData } from "./types";

export function DailyDigestComponent({
  data,
  actions,
}: WidgetRenderProps<DailyDigestData, Record<string, unknown>, WidgetActions>) {
  const entries = data?.entries ?? [];

  return (
    <WidgetCard
      title="Daily Digest"
      icon={<Activity className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="daily-digest" actions={actions} />}
      compact
      footer={
        <Link href="/timeline" className="text-sm font-medium text-[var(--color-accent)] hover:underline">
          View timeline →
        </Link>
      }
    >
      {entries.length === 0 ? (
        <EmptyState message="Nothing logged yet today." />
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const hidden = entry.count - entry.titles.length;
            return (
              <li key={entry.source} className="text-sm">
                <span className="font-medium text-[var(--foreground)]">
                  {entry.source} ({entry.count})
                </span>
                <span className="text-[var(--color-neutral-500)]">
                  : {entry.titles.join(", ")}
                  {hidden > 0 ? ` +${hidden} more` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
