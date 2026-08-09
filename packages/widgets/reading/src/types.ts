import { z } from "zod";

const readingBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  currentPage: z.number().int().nonnegative(),
  totalPage: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with @pulse/database's
 * `Reading` by hand, same as Tasks/Notes. Unlike those, `book` is a single
 * nullable record, not an array — there's no reading history to represent,
 * only ever "the current book" (or nothing, if none is set).
 */
export const readingDataSchema = z.object({
  book: readingBookSchema.nullable(),
  fetchedAt: z.string(),
});

export type ReadingBook = z.infer<typeof readingBookSchema>;
export type ReadingData = z.infer<typeof readingDataSchema>;
