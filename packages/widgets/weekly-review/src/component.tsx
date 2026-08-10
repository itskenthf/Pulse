import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { WeeklyReviewWidgetActions } from "./actions";
import { generateWeeklySummary } from "./summary";
import type { WeeklyReviewData } from "./types";

export function WeeklyReviewComponent({
  data,
  actions,
}: WidgetRenderProps<WeeklyReviewData, Record<string, unknown>, WeeklyReviewWidgetActions>) {
  const review = data?.review ?? null;
  const isSunday = data?.isSunday ?? false;

  return (
    <WidgetCard
      title="Weekly Review"
      icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="weekly-review" actions={actions} />}
      compact
      footer={
        <Link
          href="/health/weekly-review"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          {review ? "Edit →" : "Open →"}
        </Link>
      }
    >
      {review ? (
        <p className="text-sm text-[var(--foreground)]">{generateWeeklySummary(review)}</p>
      ) : isSunday ? (
        <p className="text-sm font-medium text-[var(--color-accent-700)]">
          Fill out this week&rsquo;s review →
        </p>
      ) : (
        <p className="text-xs text-[var(--color-neutral-500)]">Weekly review opens each Sunday.</p>
      )}
    </WidgetCard>
  );
}
