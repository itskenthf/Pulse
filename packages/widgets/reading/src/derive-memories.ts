import type { MemoryEvent } from "@pulse/sdk";
import type { ReadingData } from "./types";

/**
 * Two signals, matching the two established diffing sub-patterns (same
 * as GitHub's "opened" + "merged" in one file): a new book id is a
 * creation event (Notes' pattern), a book's status flipping to
 * "finished" is a state-transition event (Weight's goal-reached / GitHub's
 * PR-merged pattern). Progress-only updates (page count changing, status
 * unchanged) fire nothing. See the doc comment on `Widget.deriveMemories`
 * in @pulse/sdk for why this diffs against the previous snapshot rather
 * than firing on every fetch.
 */
export function deriveReadingMemories(previous: ReadingData | null, next: ReadingData): MemoryEvent[] {
  const events: MemoryEvent[] = [];
  const previousBooks = new Map((previous?.books ?? []).map((book) => [book.id, book]));

  for (const book of next.books) {
    const previousBook = previousBooks.get(book.id);

    if (!previousBook) {
      events.push({ title: `Started reading: ${book.title}` });
      continue;
    }

    if (book.status === "finished" && previousBook.status !== "finished") {
      events.push({ title: `Finished reading: ${book.title}` });
    }
  }

  return events;
}
