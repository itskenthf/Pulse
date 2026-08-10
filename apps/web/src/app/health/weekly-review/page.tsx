import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listWeeklyReviews, readWidgetCache } from "@pulse/database";
import { EmptyState } from "@pulse/ui";
import {
  ReviewForm,
  WEEKLY_REVIEW_WIDGET_ID,
  generateWeeklySummary,
  weeklyReviewDataSchema,
  type WeeklyReviewEntry,
} from "@pulse/widget-weekly-review";
import { auth } from "@/auth";
import { saveReviewAction } from "@/app/actions/weekly-review";

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
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Weekly Review
        </h1>

        {weekOf && (
          <p className="text-sm text-[var(--color-neutral-500)]">This week: {formatWeekOf(weekOf)}</p>
        )}

        <ReviewForm review={currentReview} action={saveReviewAction} />

        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
            Past reviews
          </h2>
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
      </main>
    </div>
  );
}
