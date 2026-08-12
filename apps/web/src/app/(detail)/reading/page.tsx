import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readWidgetCache } from "@pulse/database";
import { EmptyState } from "@pulse/ui";
import {
  AddBookForm,
  BookRow,
  READING_WIDGET_ID,
  readingDataSchema,
  type ReadingBook,
} from "@pulse/widget-reading";
import { auth } from "@/auth";
import { addBookAction, deleteBookAction, markFinishedAction, updateProgressAction } from "@/app/actions/reading";

export const metadata: Metadata = { title: "Reading" };

function BookGroup({
  label,
  books,
}: {
  label: string;
  books: ReadingBook[];
}) {
  if (books.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-sm font-semibold tracking-[0.08em] text-[var(--color-accent-700)] uppercase">
        {label}
      </h2>
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        {books.map((book) => (
          <BookRow
            key={book.id}
            book={book}
            updateProgressAction={updateProgressAction}
            markFinishedAction={markFinishedAction}
            deleteAction={deleteBookAction}
          />
        ))}
      </div>
    </div>
  );
}

export default async function ReadingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const cached = await readWidgetCache(session.user.id, READING_WIDGET_ID, readingDataSchema);
  const books = cached?.data.books ?? [];
  const reading = books.filter((book) => book.status === "reading");
  const finished = books.filter((book) => book.status === "finished");

  return (
    <>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-[var(--foreground)]">
        Reading
      </h1>

      <AddBookForm action={addBookAction} />

      {books.length === 0 ? (
        <EmptyState message="No books yet — add one above." />
      ) : (
        <div className="flex flex-col gap-6">
          <BookGroup label="Reading" books={reading} />
          <BookGroup label="Finished" books={finished} />
        </div>
      )}
    </>
  );
}
