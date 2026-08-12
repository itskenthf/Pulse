import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listWeeklyReviews, readWidgetCache } from "@pulse/database";
import { EmptyState, SectionLabel } from "@pulse/ui";
import {
  ReviewForm,
  WEEKLY_REVIEW_WIDGET_ID,
  generateWeeklySummary,
  weeklyReviewDataSchema,
  type WeeklyReviewEntry,
} from "@pulse/widget-weekly-review";
import { auth } from "@/auth";
import { saveReviewAction } from "@/app/actions/weekly-review";

export const metadata: Metadata = { title: "Weekly Review" };

const HISTORY_LIMIT = 12;

function formatWeekOf(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PastReviewRow({ review }: { review: WeeklyReviewEntry }) {
  return (
    <div className="flex flex-col gap-1 py-3">
      <p className="text-xs text-[var(--color-neutral-500)]">Week of {formatWeekOf(review.weekOf)}</p>
      <p className="text-sm text-[var(--foreground)]">{generateWeeklySummary(review)}</p>
    </div>
  );
}

export default async function WeeklyReviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const [cached, history] = await Promise.all([
    readWidgetCache(session.user.id, WEEKLY_REVIEW_WIDGET_ID, weeklyReviewDataSchema),
    listWeeklyReviews(session.user.id, HISTORY_LIMIT),
  ]);
  const currentReview = cached?.data.review ?? null;
  const weekOf = cached?.data.weekOf;
  const pastReviews = history.filter((review) => review.weekOf !== weekOf);

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Weekly Review
      </h1>

      {weekOf && (
        <p className="text-sm text-[var(--color-neutral-500)]">This week: {formatWeekOf(weekOf)}</p>
      )}

      <ReviewForm review={currentReview} action={saveReviewAction} />

      <div className="flex flex-col gap-2">
        <SectionLabel>Past reviews</SectionLabel>
        {pastReviews.length === 0 ? (
          <EmptyState message="No past reviews yet." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
            {pastReviews.map((review) => (
              <PastReviewRow key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
