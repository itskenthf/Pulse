import { z } from "zod";

const notebookEntrySchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with
 * @pulse/database's `NotebookEntry` by hand, since a plain TS interface
 * can't be turned into a schema automatically.
 */
export const notebookDataSchema = z.object({
  entries: z.array(notebookEntrySchema),
  fetchedAt: z.string(),
});

export type NotebookEntry = z.infer<typeof notebookEntrySchema>;
export type NotebookData = z.infer<typeof notebookDataSchema>;
