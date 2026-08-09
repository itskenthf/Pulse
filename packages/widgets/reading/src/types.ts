import { z } from "zod";

const readingBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  currentPage: z.number().int().nonnegative(),
  totalPage: z.number().int().positive(),
  status: z.enum(["reading", "finished"]),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with @pulse/database's
 * `Reading` by hand, same as Tasks/Notes. A real list, not a single
 * nullable record — multiple books can be "reading" at once, and finished
 * ones stay around as history.
 */
export const readingDataSchema = z.object({
  books: z.array(readingBookSchema),
  fetchedAt: z.string(),
});

export type ReadingBook = z.infer<typeof readingBookSchema>;
export type ReadingData = z.infer<typeof readingDataSchema>;
