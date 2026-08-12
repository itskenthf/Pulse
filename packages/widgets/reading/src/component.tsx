import { BookOpen } from "lucide-react";
import Link from "next/link";
import { EmptyState, ViewAllLink, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { ReadingWidgetActions } from "./actions";
import type { ReadingBook, ReadingData } from "./types";

const PREVIEW_COUNT = 3;

function BookPreview({ book }: { book: ReadingBook }) {
  const percent = Math.min(100, Math.round((book.currentPage / book.totalPage) * 100));

  return (
    <div className="flex flex-col gap-1">
      <p className="truncate text-sm text-[var(--foreground)]">{book.title}</p>
      <div className="h-1 w-full overflow-hidden rounded-full border border-[var(--color-divider)]">
        <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ReadingComponent({
  data,
  actions,
}: WidgetRenderProps<ReadingData, Record<string, unknown>, ReadingWidgetActions>) {
  const books = data?.books ?? [];
  const inProgress = books.filter((book) => book.status === "reading");

  return (
    <WidgetCard
      title="Reading"
      icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="reading" actions={actions} />}
      compact
      footer={<ViewAllLink href="/reading" />}
    >
      {inProgress.length === 0 ? (
        <EmptyState
          message="Nothing being read yet"
          action={
            <Link
              href="/reading"
              className="text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              Add a book →
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-neutral-500)]">
            {inProgress.length} in progress
          </p>
          <div className="flex flex-col gap-2.5">
            {inProgress.slice(0, PREVIEW_COUNT).map((book) => (
              <BookPreview key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
