import { z } from "zod";

const noteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * The widget's TData contract, and also its own runtime validator (see
 * `Widget.dataSchema` in @pulse/sdk) — kept in sync with
 * @pulse/database's `Note` by hand, since a plain TS interface can't be
 * turned into a schema automatically.
 */
export const noteDataSchema = z.object({
  notes: z.array(noteSchema),
  fetchedAt: z.string(),
});

export type Note = z.infer<typeof noteSchema>;
export type NoteData = z.infer<typeof noteDataSchema>;
